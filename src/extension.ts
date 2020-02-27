'use strict'

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { GZoltarCommander } from './commander';

export function activate(context: vscode.ExtensionContext) {

	const workspaceFolders = vscode.workspace.workspaceFolders;
	const workspace = workspaceFolders != undefined? workspaceFolders[0].uri.fsPath : ''; //TODO

	const mvn = ""; //TODO
	const commander = new GZoltarCommander();

	vscode.window.registerTreeDataProvider('gzoltar', commander);

	vscode.commands.registerCommand('gzoltar.clean', () => {
		vscode.window.showInformationMessage('Clean was activated.');
		
		exec(`(cd ${workspace} && ${mvn}/mvn clean test-compile)`, (err, stdout, stderr) => {
			if(err) return vscode.window.showErrorMessage(err.message);
			vscode.window.showInformationMessage('Clean completed.')
		})
	})

	vscode.commands.registerCommand('gzoltar.run', () => {
		vscode.window.showInformationMessage('Run was activated.');

		exec(`(cd ${workspace} && ${mvn}/mvn -P sufire gzoltar:prepare-agent test)`, (err, stdout, stderr) => {
			if(err) return vscode.window.showErrorMessage(err.message);
			vscode.window.showInformationMessage('Run completed.')
		})
	})

	vscode.commands.registerCommand('gzoltar.report', () => {
		vscode.window.showInformationMessage('Report was activated.');

		exec(`(cd ${workspace} && ${mvn}/mvn gzoltar:fl-report)`, (err, stdout, stderr) => {
			if(err) return vscode.window.showErrorMessage(err.message);
			vscode.window.showInformationMessage('Report completed.')
		})
	})

	vscode.commands.registerCommand('gzoltar.show', () => {
		vscode.window.showInformationMessage('Show was activated.');
	})
}

export function deactivate() {}
