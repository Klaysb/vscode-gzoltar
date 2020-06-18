'use strict';

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { join, sep } from 'path';

export class ReportPanel {

    private static currentPanel: ReportPanel | undefined;
    private static readonly viewType = 'report';

    private readonly panel: vscode.WebviewPanel;
    private readonly configPath: string;
    private readonly sourcePath: string;
    private disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, sourcePath: string, configPath: string) {
        this.panel = panel;
        this.sourcePath = sourcePath;
        this.configPath = configPath;
        this.update();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    private async update(): Promise<void> {
        const viewPath = join(this.configPath, 'sfl', 'html', 'ochiai');
        const scriptPathOnDisk = vscode.Uri.file(join(viewPath, "gzoltar.js"));
        const scriptUri = this.panel.webview.asWebviewUri(scriptPathOnDisk);

        const views = await Promise.all(
            ['sunburst.html', 'bubblehierarchy.html', 'verticalpartition.html']
                .map(s => this.setScript(join(viewPath, s), scriptUri.toString())));

        this.panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'switch':
                    this.panel.webview.html = views[message.index];
                    return;
                case 'open':
                    const reg = /(.+)\$(.+)\#(.+)\:(.+)/;
                    const split = String(message.label).split(reg);
                    const filename = join(split[1].replace(/\./g, sep), split[2]);
                    const file = join(this.sourcePath, filename) + '.java';
                    vscode.workspace.openTextDocument(filename);
                    return;
            }

        });

        this.panel.webview.html = views[0];
    }

    private async setScript(filename: string, script: string): Promise<string> {
        const file = (await fse.readFile(filename)).toString();
        const newHtml = file.replace(
            '<script type="text/javascript" src="gzoltar.js"></script>',
            `<script type="text/javascript" src="${script}"></script>`);
        return newHtml;
    }

    public dispose() {
        ReportPanel.currentPanel = undefined;
        this.panel.dispose();

        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public static createOrShow(sourcePath: string, configPath: string) {
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
                    vscode.Uri.file(join(configPath, 'sfl'))
                ]
            }
        );

        ReportPanel.currentPanel = new ReportPanel(panel, sourcePath, configPath);
    }
}