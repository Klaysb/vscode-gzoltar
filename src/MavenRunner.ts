import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { readFile, readFileSync } from 'fs';

export class MavenRunner implements IGZRunner {

	workspace = vscode.workspace.workspaceFolders != undefined? vscode.workspace.workspaceFolders[0].uri.fsPath : ''; //TODO

    runTestMethods(): void {
        const clean = 'mvn clean test-compile';
        const run = 'mvn -P sufire gzoltar:prepare-agent test';

        exec(`${clean} && ${run}`, (err, stdout, stderr) => {

        });
    }

    generateReport(): void {
        const report = 'mvn gzoltar:fl-report';
        
        exec(`${report}`, (err, stdout, stderr) => {
            
        });
    }

    showView(): void {
        // `${toolsPath}/sfl/html/ochiai/sunburst.html`
		readFile(`${this.workspace}/target/site/gzoltar/sfl/html/ochiai/sunburst.html`, (err, data) => {
			if (err) throw err;
			const html = data.toString();

			const scriptPathOnDisk = vscode.Uri.file(
				path.join(this.workspace, "target", "site", "gzoltar", "sfl", "html", "ochiai", "gzoltar.js")
			);
			const gzoltarScr = readFileSync(path.join(this.workspace, "target", "site", "gzoltar", "sfl", "html", "ochiai", "gzoltar.js")).toString();

			const panel = vscode.window.createWebviewPanel(
				'report',
				'Report',
				vscode.ViewColumn.Beside,
				{
					enableScripts: true
					//localResourceRoots: [vscode.Uri.file(toolsPath)]
				}
			);
			const scriptUri = panel.webview.asWebviewUri(scriptPathOnDisk);
			panel.webview.html = html.replace('<script type="text/javascript" src="gzoltar.js"></script>', ` <script>${gzoltarScr}</script>`);
		  });
    }
}