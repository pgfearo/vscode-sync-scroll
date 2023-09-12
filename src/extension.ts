import * as vscode from 'vscode'
import { checkSplitPanels, calculateRange, wholeLine, calculatePosition } from './utils'
import { AllStates } from './states'
import { correspondingLinesHighlight, handleScroll, modeState, offsetByEditors, reset, setContext, setCorrespondingLinesHighlight } from './scrollFunctions';

export function activate(context: vscode.ExtensionContext) {
	setContext(context)

	// Register disposables
	context.subscriptions.push(
		modeState.registerCommand(() => {
			reset()
		}),
		vscode.commands.registerTextEditorCommand('syncScroll.jumpToNextPanelCorrespondingPosition', (textEditor) => {
			const selection = textEditor.selection
			const textEditors = vscode.window.visibleTextEditors
				.filter(editor => editor !== textEditor && editor.document.uri.scheme !== 'output')
			const nextTextEditor = textEditors[(textEditors.indexOf(textEditor) + 1) % textEditors.length]
			const offset = offsetByEditors.get(nextTextEditor)
			const correspondingStartPosition = calculatePosition(selection.start, offset, textEditor, nextTextEditor)
			const correspondingPosition = new vscode.Range(correspondingStartPosition, correspondingStartPosition)
			const correspondingRange = calculateRange(selection, offset)
			vscode.window.showTextDocument(nextTextEditor.document, {
				viewColumn: nextTextEditor.viewColumn,
				selection: selection.isEmpty ? correspondingPosition : correspondingRange
			})
		}),
		vscode.commands.registerTextEditorCommand('syncScroll.copyToAllCorrespondingPositions', (textEditor) => {
			vscode.window.visibleTextEditors
				.filter(editor => editor !== textEditor && editor.document.uri.scheme !== 'output')
				.forEach(scrolledEditor => {
					scrolledEditor.edit(editBuilder =>
						textEditor.selections.map(selection =>
							editBuilder.replace(
								calculateRange(selection, offsetByEditors.get(scrolledEditor)),
								textEditor.document.getText(selection.isEmpty ? wholeLine(selection) : selection) + '\n')))
				})
		}),
		vscode.window.onDidChangeVisibleTextEditors(textEditors => {
			AllStates.areVisible = checkSplitPanels(textEditors)
			reset()
		}),
		vscode.window.onDidChangeTextEditorVisibleRanges(handleScroll),
		vscode.window.onDidChangeTextEditorSelection(({ selections, textEditor }) => {
			if (!AllStates.areVisible || modeState.isOff() || textEditor.viewColumn === undefined || textEditor.document.uri.scheme === 'output') {
				return
			}
			correspondingLinesHighlight?.dispose()
			setCorrespondingLinesHighlight(vscode.window.createTextEditorDecorationType({ backgroundColor: new vscode.ThemeColor('editor.inactiveSelectionBackground') }))
			vscode.window.visibleTextEditors
				.filter(editor => editor !== textEditor && editor.document.uri.scheme !== 'output')
				.forEach((scrolledEditor) => {
					scrolledEditor.setDecorations(
						correspondingLinesHighlight!,
						selections.map(selection => calculateRange(selection, offsetByEditors.get(scrolledEditor))),
					)
				})
		})
	)

	AllStates.init(checkSplitPanels())
}

export function deactivate() { }
