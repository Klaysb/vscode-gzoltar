'use strict'

import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { GZoltarCommander } from './commander';
import { readFile, readFileSync } from 'fs';
import { FileMaster } from './filemaster';
import * as fse from 'fs-extra';

export async function activate(context: vscode.ExtensionContext) {

	
	const fm = await createFM();
	const toolsPath = `${context.extensionPath}/tools`
	const commander = new GZoltarCommander();

	vscode.window.registerTreeDataProvider('gzoltar', commander);

	vscode.commands.registerCommand('gzoltar.list', () => {
		vscode.window.showInformationMessage('List was activated.');

		exec(`(cd ${toolsPath} && java -javaagent:"gzoltaragent.jar" -cp "${fm.getWorkspace() + fm.getTestFolder()}":"junit-4.13.jar":"gzoltarcli.jar" com.gzoltar.cli.Main listTestMethods ${fm.getWorkspace()})`, (err, stdout, stderr) => {
			if(err) return vscode.window.showErrorMessage(err.message);
			vscode.window.showInformationMessage('List completed.')
		})
	});

	vscode.commands.registerCommand('gzoltar.run', () => {
		vscode.window.showInformationMessage('Run was activated.');

		exec(`(cd ${toolsPath} && java -javaagent:gzoltaragent.jar=includes="${fm.getIncludes()}" -cp "${fm.getWorkspace() + fm.getSourceFolder()}":"${fm.getWorkspace() + fm.getTestFolder()}":"junit-4.13.jar":"gzoltarcli.jar" com.gzoltar.cli.Main runTestMethods --testMethods tests.txt --collectCoverage)`, (err, stdout, stderr) => {
			if(err) return vscode.window.showErrorMessage(err.message);
			vscode.window.showInformationMessage('Run completed.')
		});
	});

	vscode.commands.registerCommand('gzoltar.report', () => {
		vscode.window.showInformationMessage('Report was activated.');

		exec(`(cd ${toolsPath} && java -javaagent:"gzoltaragent.jar" -cp "${fm.getWorkspace()}":"junit-4.13.jar":"gzoltarcli.jar" com.gzoltar.cli.Main faultLocalizationReport --buildLocation ${fm.getWorkspace()} --dataFile gzoltar.ser --outputDirectory ${toolsPath} --formatter HTML)`, (err, stdout, stderr) => {
			if(err) return vscode.window.showErrorMessage(err.message);
			vscode.window.showInformationMessage('Report completed.')
		});
	});

	vscode.commands.registerCommand('gzoltar.show', () => {
		vscode.window.showInformationMessage('Show was activated.');

		// `${toolsPath}/sfl/html/ochiai/sunburst.html`
		readFile(`${fm.getWorkspace()}/target/site/gzoltar/sfl/html/ochiai/sunburst.html`, (err, data) => {
			if (err) throw err;
			const html = data.toString();

			const scriptPathOnDisk = vscode.Uri.file(
				path.join(fm.getWorkspace(), "target", "site", "gzoltar", "sfl", "html", "ochiai", "gzoltar.js")
			);
			const gzoltarScr = readFileSync(path.join(fm.getWorkspace(), "target", "site", "gzoltar", "sfl", "html", "ochiai", "gzoltar.js")).toString();

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

async function createFM(): Promise<FileMaster> {
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
