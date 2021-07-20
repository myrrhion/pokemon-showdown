/**
 * Async worker thread wrapper around SQLite, written to improve concurrent performance.
 * @author mia-pi-git
 */
import {ProcessWrapper, ProcessManager} from './process-manager';
import * as child_process from 'child_process';
import * as path from 'path';
import {FS} from './fs';
import type * as sqlite from 'better-sqlite3';

interface SQLOptions {
	file: string;
	/** file to import database functions from - this should be relative to this filename. */
	extension?: string;
}

type DataType = unknown[] | Record<string, unknown>;
type Statement = string | number;

type DatabaseQuery = {
	/** Prepare a statement - data is the statement. */
	type: 'prepare', data: string,
} | {
	/** Get all lines from a statement. Data is the params, num is the statement number. */
	type: 'all', data: DataType, num: number,
} | {
	/** Execute raw SQL in the database. */
	type: "exec", data: string,
} | {
	/** Get one line from a prepared statement. */
	type: 'get', data: DataType, num: number,
} | {
	/** Run a prepared statement. */
	type: 'run', data: DataType, num: number,
} | {
	type: 'transaction', num: number, data: DataType,
};

function getModule() {
	try {
		return require('better-sqlite3') as typeof sqlite.default;
	} catch {
		return null;
	}
}

export class DatabaseWrapper implements ProcessWrapper {
	statements: Map<string, number>;
	process: child_process.ChildProcess;
	pendingRequests: [((data: string | DataType | null) => any), (err: Error) => void][];
	pendingRelease?: () => void;
	constructor(options: SQLOptions) {
		this.statements = new Map();
		this.pendingRequests = [];
		this.process = child_process.fork(__filename, [], {
			env: options as AnyObject, cwd: path.resolve(__dirname, '..'), execArgv: ['-r', 'ts-node/register'],
		});
		this.listen();
	}
	getProcess() {
		return this.process;
	}
	listen() {
		this.process.on("message", (message: DataType | string) => {
			const handlers = this.pendingRequests.shift();
			if (typeof message === 'string') {
				if (message.startsWith('THROW\n')) {
					const error = new Error();
					error.stack = message.slice(6);
					if (handlers?.[1]) return handlers[1](error);
					throw error;
				}
			}
			if (handlers) {
				if (!this.pendingRequests.length && this.pendingRelease) this.pendingRelease();
				return handlers[0](message);
			}
			throw new Error(`Database wrapper received a message, but there was no pending request.`);
		});
	}
	async release() {
		await new Promise<void>(resolve => {
			this.pendingRelease = resolve;
		});
		this.process.disconnect();
		this.statements.clear();
	}
	getLoad() {
		return this.pendingRequests.length;
	}
	runFile(filename: string) {
		const file = FS(filename);
		if (!file.existsSync()) throw new Error(`File passed to runFile does not exist.`);
		if (!filename.endsWith('.sql')) throw new Error(`File passed to runFile is not a .sql file.`);
		const content = file.readSync();
		void this.exec(content);
	}
	async prepare(statement: string) {
		const cachedStatement = this.statements.get(statement);
		if (cachedStatement) {
			return cachedStatement;
		}
		const int = await this.query({type: 'prepare', data: statement});
		if (typeof int === 'number') this.statements.set(statement, int);
		return int;
	}
	all(statement: Statement, data: DataType = {}) {
		const num = typeof statement === 'number' ? statement : this.statements.get(statement);
		if (num === undefined || ![...this.statements.values()].includes(num)) {
			throw new Error(`Prepare a statement before using another database function with SQLDatabase.prepare.`);
		}
		return this.query({type: 'all', num: num, data});
	}
	get(statement: Statement, data: DataType = {}) {
		const num = typeof statement === 'number' ? statement : this.statements.get(statement);
		if (num === undefined || ![...this.statements.values()].includes(num)) {
			throw new Error(`Prepare a statement before using another database function with SQLDatabase.prepare.`);
		}
		return this.query({type: 'get', data, num});
	}
	run(statement: Statement, data: DataType) {
		const num = typeof statement === 'number' ? statement : this.statements.get(statement);
		if (num === undefined || ![...this.statements.values()].includes(num)) {
			throw new Error(`Prepare a statement before using another database function with SQLDatabase.prepare.`);
		}
		return this.query({type: 'run', num, data});
	}
	/** We don't want these to be prepared statements, since this should be used SPARINGLY. */
	exec(statement: string) {
		return this.query({type: 'exec', data: statement});
	}
	query(args: DatabaseQuery) {
		this.process.send(args);
		return new Promise<any>((resolve, reject) => {
			this.pendingRequests.push([resolve, reject]);
		});
	}
}

class SQLProcessManager extends ProcessManager {
	constructor(module: NodeJS.Module) {
		super(module);
	}
	createProcess(options: SQLOptions) {
		const process: ProcessWrapper = new DatabaseWrapper(options);
		this.processes.push(process);
		return process;
	}
	listen() {}
	destroyProcess(process: DatabaseWrapper) {
		void process.release();
		this.processes.splice(this.processes.indexOf(process), 1);
	}
}

export const PM = new SQLProcessManager(module);
const Database = getModule();

function crashlog(err: Error, query?: any) {
	process.send!(`THROW\n@!!@${JSON.stringify([err.name, err.message, 'a SQL process', query])}\n${err.stack}`);
}

if (!PM.isParentProcess) {
	let statementNum = 0;
	const statements: Map<number, sqlite.Statement> = new Map();
	const transactions: Map<number, sqlite.Transaction> = new Map();
	const {file, extension} = process.env;
	const database = Database ? new Database(file!) : null;
	if (extension && database) {
		const {
			functions,
			transactions: storedTransactions,
			statements: storedStatements,
			onDatabaseStart,
			// eslint-disable-next-line @typescript-eslint/no-var-requires
		} = require(`../${extension}`);
		if (functions) {
			for (const k in functions) {
				database.function(k, functions[k]);
			}
		}
		if (storedTransactions) {
			for (const t in storedTransactions) {
				const transaction = database.transaction(storedTransactions[t]);
				transactions.set(transactions.size + 1, transaction);
			}
		}
		if (storedStatements) {
			for (const k in storedStatements) {
				const statement = database.prepare(storedStatements[k]);
				statements.set(statementNum++, statement); // we use statementNum here to track with the rest
			}
		}
		if (onDatabaseStart) {
			onDatabaseStart(database);
		}
	}
	database?.pragma(`foreign_keys=on`);


	process.on('message', (query: DatabaseQuery) => {
		let statement;
		let results;
		try {
			switch (query.type) {
			case 'prepare': {
				if (!database) return process.send!(-1);
				const {data} = query;
				const newStatement = database.prepare(data);
				const nextNum = statementNum++;
				statements.set(nextNum, newStatement);
				return process.send!(nextNum);
			}
			case 'all': {
				if (!database) {
					results = [];
					break;
				}
				const {num, data} = query;
				statement = statements.get(num);
				results = statement?.all(data) || [];
			}
				break;
			case 'get': {
				if (!database) {
					results = null;
					break;
				}
				const {num, data} = query;
				statement = statements.get(num);
				results = statement?.get(...data as any) || null;
			}
				break;
			case 'run': {
				if (!database) {
					results = null;
					break;
				}
				const {num, data} = query;
				statement = statements.get(num);
				results = statement?.run(...data as any) || null;
			}
				break;
			case 'exec': {
				const {data} = query;
				database?.exec(data);
				results = !!database;
			}
				break;
			case 'transaction': {
				if (!database) {
					results = null;
					break;
				}
				const {num, data} = query;
				const transaction = transactions.get(num);
				if (!transaction) {
					results = null;
					break;
				}
				results = transaction(database, data);
			}
				break;
			}
		} catch (error) {
			return crashlog(error, query);
		}
		process.send!(results);
	});

	process.on('uncaughtException', err => crashlog(err));
	process.on('unhandledRejection', err => crashlog(err as any));
}

/**
 * @param options Either an object of filename, extension, or just the string filename
 */
export function SQL(options: SQLOptions | string) {
	if (typeof options === 'string') options = {file: options};
	return PM.createProcess(options);
}
