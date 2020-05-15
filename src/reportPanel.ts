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
                .map(s => new ViewFile(join(viewPath, s)).setScript(scriptUri.toString())));

        const viewUris = views
            .map(v => vscode.Uri.file(v))
            .map(v => this.panel.webview.asWebviewUri(v).toString());

        this.panel.webview.html = this.formatMain(viewUris);
    }

    private formatMain(views: string[]): string {
        return `<html>
                    <head>
                        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css" integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous">
                        <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>
                        <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js" integrity="sha384-Q6E9RHvbIyZFJoft+2mJbHaEWldlvI9IOYy5n3zV9zzTtmI3UksdQRVvoxMfooAo" crossorigin="anonymous"></script>
                        <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/js/bootstrap.min.js" integrity="sha384-OgVRvuATP1z7JjHLkuOU7Xw704+h835Lr+6QL9UvYjZE3Ipu6Tp75j7Bh/kR0JKI" crossorigin="anonymous"></script>
                    </head>
                    <body>
                        <ul class="nav nav-tabs" id="myTab" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link active" id="home-tab" data-toggle="tab" href="#home" role="tab" aria-controls="home" aria-selected="true">Sunburst</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="profile-tab" data-toggle="tab" href="#profile" role="tab" aria-controls="profile" aria-selected="false">Bubble Hierarchy</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="contact-tab" data-toggle="tab" href="#contact" role="tab" aria-controls="contact" aria-selected="false">Vertical Partition</a>
                            </li>
                        </ul>
                        <div class="tab-content" id="myTabContent">
                            <div class="tab-pane fade show active" id="home" role="tabpanel" aria-labelledby="home-tab">
                                <iframe src="${views[0]}" style="overflow: hidden;border:none;" scrolling='no' height='300' width='600'></iframe>
                            </div>
                
                            <div class="tab-pane fade" id="profile" role="tabpanel" aria-labelledby="profile-tab">
                                <iframe src="${views[1]}" style="overflow: hidden;border:none;" scrolling='no' height='300' width='600'></iframe>
                            </div>
                
                            <div class="tab-pane fade" id="contact" role="tabpanel" aria-labelledby="contact-tab">
                                <iframe src="${views[2]}" style="overflow: hidden;border:none;" scrolling='no' height='300' width='600'></iframe>
                            </div>
                        </div>
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