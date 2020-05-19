'use strict';

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { join } from 'path';

export class ReportPanel {

    private static currentPanel: ReportPanel | undefined;
    private static readonly viewType = 'report';

    private readonly panel: vscode.WebviewPanel;
    private readonly configPath: string;
    private disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, configPath: string) {
        this.panel = panel;
        this.configPath = configPath;
        this.update();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public static createOrShow(toolsPath: string, configPath: string) {
        const column = vscode.ViewColumn.Beside;

        if (ReportPanel.currentPanel) {
            ReportPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            ReportPanel.viewType,
            'GZoltar Reports',
            column,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(join(toolsPath, 'view')),
                    vscode.Uri.file(join(configPath, 'sfl'))
                ]
            }
        );

        ReportPanel.currentPanel = new ReportPanel(panel, configPath);
    }

    private dispose() {
        ReportPanel.currentPanel = undefined;
        this.panel.dispose();

        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async update(): Promise<void> {
        const viewPath = join(this.configPath, 'sfl', 'html', 'ochiai');
        const scriptPathOnDisk = vscode.Uri.file(join(viewPath, "gzoltar.js"));
        const scriptUri = this.panel.webview.asWebviewUri(scriptPathOnDisk);

        const views = await Promise.all(
            ['sunburst.html', 'bubblehierarchy.html', 'verticalpartition.html']
                .map(s => new ViewFile(join(viewPath, s))
                .setHtml(scriptUri.toString(), this.webviewHtml())));

        this.panel.webview.onDidReceiveMessage((message) => {
            this.panel.webview.html = views[message.index];
        });

        this.panel.webview.html = views[0];
    }

    private webviewHtml(): string {
        return `<button onclick="change(0)">Sunburst</button>
                <button onclick="change(1)">Bubble Hierarchy</button>
                <button onclick="change(2)">Vertical Partition</button>
                <script>
                    const vscode = acquireVsCodeApi();
                    function change(num) {
                        vscode.postMessage({index: num});
                    }
                </script>`;
    }
}

class ViewFile {

    private readonly fileName: string;

    constructor(fileName: string) {
        this.fileName = fileName;
    }

    public async setHtml(script: string, html: string): Promise<string> {
        const file = (await fse.readFile(this.fileName)).toString();
        const newHtml = file.replace(
            '<script type="text/javascript" src="gzoltar.js"></script>', 
            `<script type="text/javascript" src="${script}"></script>\n${html}`);
        return newHtml;
    }
}