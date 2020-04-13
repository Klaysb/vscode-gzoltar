'use strict'

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import * as path from 'path';
import { FileMaster } from './filemaster';
import { GZoltarCommander } from './commander';

export async function activate(context: vscode.ExtensionContext) {

	const filemaster = await createFileMaster();
	const commander = new GZoltarCommander(filemaster, context.extensionPath);

	vscode.window.registerTreeDataProvider('gzoltar', commander);

	vscode.commands.registerCommand('gzoltar.cleanup', async () => await commander.cleanup())

	vscode.commands.registerCommand('gzoltar.run', async () => await commander.runTestMethods());

	vscode.commands.registerCommand('gzoltar.report', async () => await commander.generateReport());

	vscode.commands.registerCommand('gzoltar.show', async () => await commander.showView());
}

export function deactivate() {}

async function createFileMaster(): Promise<FileMaster> {
	if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
		throw new Error('Unable to locate workspace, extension has been incorrectly activated.');
	}

	for (const workspaceFolder of vscode.workspace.workspaceFolders) {
		const res = await getBuildTool(workspaceFolder.uri.fsPath);
		if (res != '') {
			return new FileMaster(res, workspaceFolder.uri.fsPath);
		}
	}

	throw new Error('Unable to locate build tool in workspaces, extension has been incorrectly activated.');
}	

async function getBuildTool(folderPath: string): Promise<string> {
	if (await fse.pathExists(path.join(folderPath, 'pom.xml')))
		return 'maven';
	if (await fse.pathExists(path.join(folderPath, 'build.gradle')))
		return 'gradle';
	if (await fse.pathExists(path.join(folderPath, 'build.xml')))
		return 'ant';
	return '';
}
