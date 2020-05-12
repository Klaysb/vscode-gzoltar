'use strict';

import * as vscode from 'vscode';
import { FileMaster } from './filemaster';
import { GZoltarCommander } from './commander';

export async function activate(context: vscode.ExtensionContext) {

	if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
		throw new Error('Unable to locate workspace, extension has been incorrectly activated.');
	}

	const workspace = vscode.workspace.workspaceFolders[0];
	const filemaster = new FileMaster(workspace.uri.fsPath);
	const commander = new GZoltarCommander(filemaster, context.extensionPath);

	vscode.window.registerTreeDataProvider('gzoltar', commander);

	vscode.commands.registerCommand('gzoltar.setsource', (args) => {
		filemaster.setSourceFolder(args.path);
	});

	vscode.commands.registerCommand('gzoltar.settest', (args) => {
		filemaster.setTestFolder(args.path);
	});

	vscode.commands.registerCommand('gzoltar.cleanup', async () => await commander.cleanup());

	vscode.commands.registerCommand('gzoltar.run', async () => await commander.runTestMethods());

	vscode.commands.registerCommand('gzoltar.report', async () => await commander.generateReport());

	vscode.commands.registerCommand('gzoltar.show', async () => await commander.showView());
}

export function deactivate() {}
