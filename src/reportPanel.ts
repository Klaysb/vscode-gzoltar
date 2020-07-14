'use strict';

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { join, sep } from 'path';

export class ReportPanel {

    private static readonly viewType = 'report';

    private readonly panel: vscode.WebviewPanel;
    private readonly workspacePath: string;
    private readonly views: string[];
    private disposables: vscode.Disposable[] = [];
    private disposeListener?: () => any;

    private constructor(panel: vscode.WebviewPanel, workspacePath: string, views: string[]) {
        this.panel = panel;
        this.workspacePath = workspacePath;
        this.views = views;
        this.update(0);
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        const lstnr = this.panel.webview.onDidReceiveMessage((message) => this.openDoc(message.label));
        this.disposables.push(lstnr);
    }
    
    public update(index: number): void {
        this.panel.webview.html = this.views[index];
        this.panel.reveal();
    }

    public onDispose(listener: () => any): void {
        this.disposeListener = listener;
    }

    public dispose(): void {
        this.panel.dispose();
        this.disposeListener?.();
        this.disposables.forEach(d => d?.dispose());
        this.disposables = [];
    }

    private openDoc(label: string): void {
        const reg = /(.+)\$(.+)\#(.+)\:(.+)/;
        const split = String(label).split(reg);
        const file = join(split[1].replace(/\./g, sep), split[2]);
        const filename = join(this.workspacePath, 'src', 'main', 'java', file) + '.java';
        vscode.window.showTextDocument(vscode.Uri.file(filename), { viewColumn: vscode.ViewColumn.One });
    }

    public static async createPanel(configPath: string, workspacePath: string): Promise<ReportPanel> {
        const panel = vscode.window.createWebviewPanel(
            ReportPanel.viewType,
            'GZoltar Reports',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [ vscode.Uri.file(join(configPath, 'sfl')) ]
            }
        );

        const viewPath = join(configPath, 'sfl', 'html', 'ochiai');
        const scriptPathOnDisk = vscode.Uri.file(join(viewPath, "gzoltar.js"));
        const scriptUri = panel.webview.asWebviewUri(scriptPathOnDisk);

        const views = await Promise.all(
            ['sunburst.html', 'bubblehierarchy.html', 'verticalpartition.html']
                .map(s => this.setScript(join(viewPath, s), scriptUri.toString())));

        return new ReportPanel(panel, workspacePath, views);
    }

    private static async setScript(filename: string, script: string): Promise<string> {
        const file = (await fse.readFile(filename)).toString();
        const newHtml = file.replace(
            '<script type="text/javascript" src="gzoltar.js"></script>',
            `<script type="text/javascript" src="${script}"></script>`);
        return newHtml;
    }
}