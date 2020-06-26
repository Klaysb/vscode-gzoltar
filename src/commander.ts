'use strict';

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { join, basename } from 'path';
import { listFunction, runFunction, reportFunction } from './cmdLine/cmdBuilder';
import { ReportPanel } from './reportPanel';
import { Decorator } from './decoration/decorator';
import { FolderContainer } from './workspace/container';
const exec = require('util').promisify(require('child_process').exec);

export class GZoltarCommander implements vscode.TreeDataProvider<GZoltarCommand> {

    private _onDidChangeTreeData: vscode.EventEmitter<GZoltarCommand | undefined> = new vscode.EventEmitter<GZoltarCommand | undefined>();
    readonly onDidChangeTreeData: vscode.Event<GZoltarCommand | undefined> = this._onDidChangeTreeData.event;

    private readonly extensionPath: string;
    private readonly container: FolderContainer;
    private readonly reportOptions: { [key: string]: boolean } = {
        'Public Methods': true,
        'Static Constructors': true,
        'Deprecated Methods': true
    };

    constructor(extensionPath: string, container: FolderContainer) {
        this.extensionPath = extensionPath;
        this.container = container;
    }
    
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setOption(key: string): void {
        this.reportOptions[key] = !this.reportOptions[key];
        this.refresh();
    }

    getTreeItem(element: GZoltarCommand): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: GZoltarCommand | undefined): vscode.ProviderResult<GZoltarCommand[]> {
        if (!element) {
            return [
                new GZoltarCommand('OPEN FOLDERS', vscode.TreeItemCollapsibleState.Expanded),
                new GZoltarCommand('REPORT OPTIONS', vscode.TreeItemCollapsibleState.Expanded)
            ];
        }

        if (element.label === 'OPEN FOLDERS') {
            return this.container.getFolders().map(path => 
                new GZoltarCommand(basename(path), vscode.TreeItemCollapsibleState.None, path)
            );
        }

        if (element.label === 'REPORT OPTIONS') {
            const lightPath = join(this.extensionPath, 'resources', 'light');
            const darkPath = join(this.extensionPath, 'resources', 'dark');

            return Object.keys(this.reportOptions).map(key => {
                const active = this.reportOptions[key];
                const gz = new GZoltarCommand(key, vscode.TreeItemCollapsibleState.None);
                gz.tooltip = `Include ${key} in the Report.`;
                gz.command = { command: 'extension.setOption', title: '', arguments: [key] };
                gz.iconPath = {
                    light: active? join(lightPath, 'checked.svg') : join(lightPath, 'unchecked.svg'),
                    dark: active? join(darkPath, 'checked.svg') : join(darkPath, 'unchecked.svg')
                };
                return gz;
            });
        }
    }

    async reset(key: string, toolspath: string) {
        const folder = this.container.getFolder(key);
        await folder.resetConfig(toolspath);
        vscode.window.showInformationMessage('Reset Completed.');
    }

    async run(key: string) {
        vscode.window.showInformationMessage('Run Initiated.');
        const folder = this.container.getFolder(key);

        await folder.cleanup();
        await folder.copyToBuild();
        
        const configPath = folder.configPath;
        const includes = await folder.getIncludes();
        const dependencies = await folder.getDependencies();
        const rankingPath = join(configPath, 'sfl', 'txt', 'ochiai.ranking.csv');

        await exec(listFunction(configPath, dependencies, folder.testFolder));
        await exec(runFunction(configPath, dependencies, includes));
        await exec(reportFunction(configPath, this.reportOptions['Public Methods'], this.reportOptions['Static Constructors'], this.reportOptions['Deprecated Methods']));

        const ranking = (await fse.readFile(rankingPath)).toString();
        folder.setDecorator(Decorator.createDecorator(ranking, this.extensionPath));
        folder.setWebview(ReportPanel.createPanel(configPath, folder.folderPath));
    }
}

export class GZoltarCommand extends vscode.TreeItem {

    public children: GZoltarCommand[] = [];

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly path?: string
    ) {
        super(label, collapsibleState);
    }

    contextValue = this.path? 'folder' : '';
}
