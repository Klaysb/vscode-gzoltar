'use strict';

import * as vscode from 'vscode';
import { join } from 'path';
import { WSContainer } from './workspace/container';
import { GZoltarCommander } from './commander';

export async function activate(context: vscode.ExtensionContext) {

	if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
		throw new Error('Unable to locate workspace, extension has been activated incorrectly.');
	}

	const workspaces = vscode.workspace.workspaceFolders.map(wf => wf.uri.fsPath);
	const toolsPath = join(context.extensionPath, 'tools');
	const commander = new GZoltarCommander(context.extensionPath);
	const container = new WSContainer();

	container.addWorkspaces(workspaces, toolsPath);
	const debugWs = vscode.workspace.workspaceFolders[0].uri.fsPath;

	vscode.window.registerTreeDataProvider('gzoltar', commander);

	vscode.commands.registerCommand('gzoltar.setsource', async (args) => {
		const debug = args;
		// await filemaster.setSourceFolder(args.path);
	});

	vscode.commands.registerCommand('gzoltar.settest', async (args) => {
		const debug = "";
		// await filemaster.setTestFolder(args.path);
	});

	vscode.commands.registerCommand('gzoltar.reset', async () => { 
		const ws = container.getWorkspace(debugWs);
		await commander.reset(ws, toolsPath); 
	});

	vscode.commands.registerCommand('gzoltar.run', async () => {
		const ws = container.getWorkspace(debugWs);
		await commander.run(ws);
	});
}

export function deactivate() { }
