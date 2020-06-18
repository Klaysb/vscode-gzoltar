'use strict';

import * as vscode from 'vscode';
import { join } from 'path';
import { FileMaster } from './filemaster';
import { GZoltarCommander } from './commander';

export async function activate(context: vscode.ExtensionContext) {

	if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
		throw new Error('Unable to locate workspace, extension has been activated incorrectly.');
	}

	const workspace = vscode.workspace.workspaceFolders[0].uri.fsPath;
	const toolsPath = join(context.extensionPath, 'tools');
	const filemaster = await FileMaster.createFileMaster(workspace, toolsPath);
	const commander = new GZoltarCommander(filemaster, context.extensionPath);

	vscode.window.registerTreeDataProvider('gzoltar', commander);

	vscode.commands.registerCommand('gzoltar.setsource', async (args) => {
		await filemaster.setSourceFolder(args.path);
	});

	vscode.commands.registerCommand('gzoltar.settest', async (args) => {
		await filemaster.setTestFolder(args.path);
	});

	vscode.commands.registerCommand('gzoltar.reset', async () => { await commander.reset(toolsPath); });

	vscode.commands.registerCommand('gzoltar.run', async () => await commander.run());
}

export function deactivate() { }
