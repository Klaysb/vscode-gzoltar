'use strict';

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { join, sep } from 'path';

export class ReportPanel {

    private static readonly viewType = 'report';

    private readonly panel: vscode.WebviewPanel;
    private readonly configPath: string;
    private readonly workspacePath: string;
    private disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, configPath: string, workspacePath: string) {
        this.panel = panel;
        this.configPath = configPath;
        this.workspacePath = workspacePath;
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
                    this.openDoc(message.label);
                    return;
            }

        });

        this.panel.webview.html = views[0];
    }

    private openDoc(label: string): void {
        const reg = /(.+)\$(.+)\#(.+)\:(.+)/;
        const split = String(label).split(reg);
        const file = join(split[1].replace(/\./g, sep), split[2]);
        const filename = join(this.workspacePath, 'src', 'main', 'java', file) + '.java';
        vscode.workspace.openTextDocument(filename);
    }

    private async setScript(filename: string, script: string): Promise<string> {
        const file = (await fse.readFile(filename)).toString();
        const newHtml = file.replace(
            '<script type="text/javascript" src="gzoltar.js"></script>',
            `<script type="text/javascript" src="${script}"></script>`);
        return newHtml;
    }

    public dispose() {
        this.panel.dispose();

        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public static createOrShow(configPath: string, workspacePath: string): ReportPanel {
        const panel = vscode.window.createWebviewPanel(
            ReportPanel.viewType,
            'GZoltar Reports',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(join(configPath, 'sfl'))
                ]
            }
        );

        return new ReportPanel(panel, configPath, workspacePath);
    }
}