'use strict'

import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { GZoltarCommander } from './commander';
import { readFile, fstat, readFileSync } from 'fs';

export function activate(context: vscode.ExtensionContext) {

	const workspaceFolders = vscode.workspace.workspaceFolders;
	const workspace = workspaceFolders != undefined? workspaceFolders[0].uri.fsPath : ''; //TODO

	const toolsPath = `${context.extensionPath}/tools`
	const commander = new GZoltarCommander();

	vscode.window.registerTreeDataProvider('gzoltar', commander);

	vscode.commands.registerCommand('gzoltar.list', () => {
		vscode.window.showInformationMessage('List was activated.');

		exec(`(cd ${toolsPath} && java -javaagent:"gzoltaragent.jar" -cp "${workspace}":"junit-4.13.jar":"gzoltarcli.jar" com.gzoltar.cli.Main listTestMethods ${workspace})`, (err, stdout, stderr) => {
			if(err) return vscode.window.showErrorMessage(err.message);
			vscode.window.showInformationMessage('List completed.')
		})
	});

	vscode.commands.registerCommand('gzoltar.run', () => {
		vscode.window.showInformationMessage('Run was activated.');

		exec(`(cd ${toolsPath} && java -javaagent:"gzoltaragent.jar" -cp "${workspace}":"junit-4.13.jar":"gzoltarcli.jar" com.gzoltar.cli.Main runTestMethods --testMethods tests.txt --collectCoverage)`, (err, stdout, stderr) => {
			if(err) return vscode.window.showErrorMessage(err.message);
			vscode.window.showInformationMessage('Run completed.')
		});
	});

	vscode.commands.registerCommand('gzoltar.report', () => {
		vscode.window.showInformationMessage('Report was activated.');

		exec(`(cd ${toolsPath} && java -javaagent:"gzoltaragent.jar" -cp "${workspace}":"junit-4.13.jar":"gzoltarcli.jar" com.gzoltar.cli.Main faultLocalizationReport --buildLocation ${workspace} --dataFile gzoltar.ser --outputDirectory ${toolsPath} --formatter HTML)`, (err, stdout, stderr) => {
			if(err) return vscode.window.showErrorMessage(err.message);
			vscode.window.showInformationMessage('Report completed.')
		});
	});

	vscode.commands.registerCommand('gzoltar.show', () => {
		vscode.window.showInformationMessage('Show was activated.');

		// `${toolsPath}/sfl/html/ochiai/sunburst.html`
		readFile(`${workspace}/target/site/gzoltar/sfl/html/ochiai/sunburst.html`, (err, data) => {
			if (err) throw err;
			const html = data.toString();

			const scriptPathOnDisk = vscode.Uri.file(
				path.join(workspace, "target", "site", "gzoltar", "sfl", "html", "ochiai", "gzoltar.js")
			);
			const gzoltarScr = readFileSync(path.join(workspace, "target", "site", "gzoltar", "sfl", "html", "ochiai", "gzoltar.js")).toString();

			const panel = vscode.window.createWebviewPanel(
				'report',
				'Report',
				vscode.ViewColumn.Beside,
				{
					enableScripts: true,
					localResourceRoots: [vscode.Uri.file(toolsPath)]
				}
			);
			const scriptUri = panel.webview.asWebviewUri(scriptPathOnDisk);
			panel.webview.html = html.replace('<script type="text/javascript" src="gzoltar.js"></script>', ` <script>${gzoltarScr}</script>`);
		  });
	});
}

export function deactivate() {}
