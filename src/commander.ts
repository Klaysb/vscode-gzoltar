'use strict';

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { join } from 'path';
import { FileMaster } from './filemaster';
import { listFunction, runFunction, reportFunction } from './cmdLine/cmdBuilder';
import { ReportPanel } from './reportPanel';
import util = require('util');
const exec = util.promisify(require('child_process').exec);


export class GZoltarCommander implements vscode.TreeDataProvider<GZoltarCommand> {

    private readonly commands: GZoltarCommand[];
    private readonly fileMaster: FileMaster;
    private readonly configPath: string;
    private readonly buildPath: string;
    private docChanged: boolean = true;

    constructor(fileMaster: FileMaster) {
        this.fileMaster = fileMaster;
        this.configPath = fileMaster.getConfig();
        this.buildPath = join(this.configPath, 'build');
        this.commands = this.buildCommander();

        vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
            this.docChanged = true;
        });
    }

    buildCommander(): GZoltarCommand[] {
        const runTestCommand = new GZoltarCommand('Run GZoltar', vscode.TreeItemCollapsibleState.None, { command: 'gzoltar.run', title: 'Run GZoltar' });
        const showViewCommand = new GZoltarCommand('Show Views', vscode.TreeItemCollapsibleState.None, { command: 'gzoltar.show', title: 'Show Views' });
        const resetCommand = new GZoltarCommand('Reset Config', vscode.TreeItemCollapsibleState.None, { command: 'gzoltar.reset', title: 'Reset Config' });
        return [runTestCommand, showViewCommand, resetCommand];
    }

    getTreeItem(element: GZoltarCommand): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: GZoltarCommand | undefined): vscode.ProviderResult<GZoltarCommand[]> {
        if (!element) {
            return Promise.resolve(this.commands);
        }
        return Promise.resolve(element.children);
    }

    async run() {
        await this.cleanup();
        await this.list();
        await this.runTests();
        await this.report();
        this.docChanged = false;
        vscode.window.showInformationMessage('Run Completed.');
    }

    private async cleanup(): Promise<void> {
        await Promise.all([
            fse.emptyDir(this.buildPath),
            fse.emptyDir(join(this.configPath, 'sfl')),
            fse.remove(join(this.configPath, 'tests.txt')),
            fse.remove(join(this.configPath, 'gzoltar.ser'))
        ]);
    }

    private async list(): Promise<void> {
        return exec(listFunction(this.configPath, this.fileMaster.getTestFolder(), this.fileMaster.getWorkspace()))
            .catch((_err: any) => { });
    }

    private async runTests(): Promise<void> {
        await this.fileMaster.copySourcesTo(this.buildPath);
        const includes = await this.fileMaster.getIncludes();

        return exec(runFunction(this.configPath, includes))
            .catch((_err: any) => { });
    }

    private async report(): Promise<void> {
        return exec(reportFunction(this.configPath))
            .catch((_e: Error) => { });
    }

    async showViews(toolspath: string) {
        if (this.docChanged) {
            await this.run();
        }

        ReportPanel.createOrShow(toolspath, this.configPath);
    }
}

export class GZoltarCommand extends vscode.TreeItem {

    public children: GZoltarCommand[] = [];

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
    }
}