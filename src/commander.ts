'use strict';

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { join } from 'path';
import { listFunction, runFunction, reportFunction } from './cmdLine/cmdBuilder';
import { ReportPanel } from './reportPanel';
import { Decorator } from './decoration/decorator';
import { Workspace } from './workspace/workspace';
const exec = require('util').promisify(require('child_process').exec);

export class GZoltarCommander implements vscode.TreeDataProvider<GZoltarCommand> {

    private readonly commands: GZoltarCommand[];
    private readonly extensionPath: string;

    constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
        this.commands = this.buildCommander();
    }

    buildCommander(): GZoltarCommand[] {
        const runTestCommand = new GZoltarCommand('Run GZoltar', vscode.TreeItemCollapsibleState.None, { command: 'gzoltar.run', title: 'Run GZoltar' });
        const resetCommand = new GZoltarCommand('Reset Config', vscode.TreeItemCollapsibleState.None, { command: 'gzoltar.reset', title: 'Reset Config' });
        return [runTestCommand, resetCommand];
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

    async reset(workspace: Workspace, toolspath: string) {
        await workspace.resetConfig(toolspath);
        vscode.window.showInformationMessage('Reset Completed.');
    }

    async run(workspace: Workspace) {
        await workspace.cleanup();
        await workspace.copyToBuild();
        
        const configPath = workspace.configPath;
        const includes = await workspace.getIncludes();
        const dependencies = await workspace.getDependencies();

        await exec(listFunction(configPath, dependencies, workspace.testFolder));
        await exec(runFunction(configPath, dependencies, includes));
        await exec(reportFunction(configPath));

        const ranking = (await fse.readFile(join(configPath, 'sfl', 'txt', 'ochiai.ranking.csv'))).toString();
        workspace.setDecorator(Decorator.createDecorator(ranking, this.extensionPath));
        workspace.setWebview(ReportPanel.createOrShow(configPath, workspace.workspacePath));
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
