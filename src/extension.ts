'use strict'

import * as vscode from 'vscode';
import { GZoltarCommander } from './commander';

export function activate(context: vscode.ExtensionContext) {

	const commander = new GZoltarCommander();
	vscode.window.registerTreeDataProvider('gzoltar', commander);

	vscode.commands.registerCommand('gzoltar.run', () => {
		vscode.window.showInformationMessage('Run was activated.');
	})

	vscode.commands.registerCommand('gzoltar.report', () => {
		vscode.window.showInformationMessage('Report was activated.');
	})

	vscode.commands.registerCommand('gzoltar.show', () => {
		vscode.window.showInformationMessage('Show was activated.');
	})
}

export function deactivate() {}
