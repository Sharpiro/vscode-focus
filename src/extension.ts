'use strict';

import * as vscode from 'vscode';

interface Container {
	uri: vscode.Uri
	emitter: vscode.EventEmitter<vscode.Uri>
	// value: string
}

const containers = new Map<string, Container>();

export function activate({ subscriptions }: vscode.ExtensionContext) {

	// register a content provider for the cowsay-scheme
	const myScheme = 'cowsay';
	const myProvider = new class implements vscode.TextDocumentContentProvider {

		// emitter and its event
		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;
		// private _subscriptions: vscode.Disposable;

		_subscriptions = vscode.workspace.onDidCloseTextDocument(doc => {
			containers.delete(doc.uri.toString())
		})

		dispose() {
			this._subscriptions.dispose();
			containers.clear()
		}

		provideTextDocumentContent(uri: vscode.Uri): string {
			const container = containers.get(uri.toString())
			if (!container) {
				containers.set(uri.toString(), { uri: uri, emitter: this.onDidChangeEmitter })
			}
			const activeEditor = vscode.window.activeTextEditor as vscode.TextEditor
			const text = activeEditor.document.getText(activeEditor.selection)
			return text
		}
	}
	subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider));

	// register a command that opens a cowsay-document
	subscriptions.push(vscode.commands.registerCommand('cowsay.send', async () => {
		const activeEditor = vscode.window.activeTextEditor
		if (activeEditor && !activeEditor.selection.isEmpty) {
			const uri = vscode.Uri.parse('cowsay:' + "cowsay-send.js");
			const docs = vscode.workspace.textDocuments
			// vscode.workspace.docum
			// let doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
			// const isClosed = doc.isClosed
			const container = containers.get(uri.toString())
			if (container) {
				container.emitter.fire(uri)
				return
			}
			await vscode.window.showTextDocument(uri, { preview: false });
		}
	}));

	// register a command that opens a cowsay-document
	subscriptions.push(vscode.commands.registerCommand('cowsay.say', async () => {
		let what = await vscode.window.showInputBox({ placeHolder: 'cowsay...' });
		if (what) {
			let uri = vscode.Uri.parse('cowsay:' + what);
			
			// await vscode.window.showTextDocument(doc, { preview: false });
			await vscode.window.showTextDocument(uri, { preview: false });
		}
	}));

	// register a command that updates the current cowsay
	subscriptions.push(vscode.commands.registerCommand('cowsay.backwards', async () => {
		if (!vscode.window.activeTextEditor) {
			return; // no editor
		}
		let { document } = vscode.window.activeTextEditor;
		if (document.uri.scheme !== myScheme) {
			return; // not my scheme
		}
		// get path-components, reverse it, and create a new uri
		let say = document.uri.path;
		let newSay = say.split('').reverse().join('');
		let newUri = document.uri.with({ path: newSay });
		await vscode.window.showTextDocument(newUri, { preview: false });
	}))
}
