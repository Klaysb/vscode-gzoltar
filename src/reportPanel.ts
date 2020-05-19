'use strict';

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { join, format } from 'path';

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
                .setScript(scriptUri.toString())));

        const viewUris = views
            .map(v => vscode.Uri.file(v))
            .map(v => this.panel.webview.asWebviewUri(v).toString());

        this.panel.webview.html = this.formatMain(viewUris);
    }

    private formatMain(views: string[]): string {
        return `<html>
        <head>
            <title>GZoltar</title>
        </head>

        <body>
            <div>
                <ul>
                    <button onclick="change('sunburst')">Sunburst</button>
                    <button onclick="change('bubble')">Bubble Hierarchy</button>
                    <button onclick="change('vertical')">Vertical Partition</button>
                </ul>
            </div>
            <div id="sunburst">
                <iframe src="${views[0]}" id="sunburstF" style="overflow: hidden;border:none;" scrolling='no' height='100%'
                    width='100%' allowfullscreen></iframe>
            </div>
            <div id="bubble" style="display: none;">
                <iframe src="${views[1]}" id="bubbleF" style="overflow: hidden;border:none;" scrolling='no'
                        height='100%' width='100%' allowfullscreen></iframe>
            </div>
            <div id="vertical" style="display: none;">
                <iframe src="${views[2]}" id="verticalF" style="overflow: hidden;border:none;" scrolling='no'
                    height='100%' width='100%' allowfullscreen></iframe>
            </div>
            <script>
                let active = document.getElementById('sunburst');
    
                function change(id) {
                    active.style.display = 'none';
                    active = document.getElementById(id);
                    active.style.display = 'inline';
                }
            </script>
        </body>
    </html>`;
    }
}

class ViewFile {
    private readonly fileName: string;

    constructor(fn: string) {
        this.fileName = fn;
    }

    public async setScript(script: string): Promise<string> {
        const file = (await fse.readFile(this.fileName)).toString();
        const newFile = file.replace('"gzoltar.js"', `"${script}"`);
        await fse.writeFile(this.fileName, newFile);
        return this.fileName;
    }
}