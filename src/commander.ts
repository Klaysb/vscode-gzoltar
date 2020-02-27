import * as vscode from 'vscode'

export class GZoltarCommander implements vscode.TreeDataProvider<GZoltarCommand> {

    commands: GZoltarCommand[] = []

    constructor() {
        this.buildCommander();
    }

    buildCommander() {
        const cleanCommand = new GZoltarCommand('Clean Project', vscode.TreeItemCollapsibleState.None, {command: 'gzoltar.clean', title: ''});
        const runTestCommand = new GZoltarCommand('Run Test Methods', vscode.TreeItemCollapsibleState.None, {command: 'gzoltar.run', title: ''});
        const reportCommand = new GZoltarCommand('Generate Report', vscode.TreeItemCollapsibleState.None, {command: 'gzoltar.report', title: ''});
        const showviewCommand = new GZoltarCommand('Show View', vscode.TreeItemCollapsibleState.None, {command: 'gzoltar.show', title: ''});

        this.commands.push(cleanCommand, runTestCommand, reportCommand, showviewCommand);
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


}

export class GZoltarCommand extends vscode.TreeItem {

    public children: GZoltarCommand[] = []

    constructor(
        public readonly label: string, 
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState)
    }
}