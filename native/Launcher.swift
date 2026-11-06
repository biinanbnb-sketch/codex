import AppKit
import WebKit

final class Launcher: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler {
    var appName: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String ?? "codex" }
    var process: Process?
    var window: NSWindow?
    var web: WKWebView?
    var watchdog: Timer?
    var completed = false
    let preview = CommandLine.arguments.contains("--preview") || CommandLine.arguments.contains("--smoke-test")
    let smoke = CommandLine.arguments.contains("--smoke-test")

    func fail(_ message: String) {
        if smoke { print("SMOKE FAIL: \(message)"); fflush(stdout); exit(1) }
        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.messageText = appName
        alert.informativeText = message
        alert.addButton(withTitle: "知道了")
        alert.runModal()
        NSApp.terminate(nil)
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        if preview { showPreview(); return }
        NSApp.setActivationPolicy(.accessory)
        guard let app = NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.openai.codex") else {
            fail("没有找到官方 Codex / ChatGPT 应用。"); return
        }
        let running = NSRunningApplication.runningApplications(withBundleIdentifier: "com.openai.codex")
        if CommandLine.arguments.contains("--probe") {
            let data = try! JSONSerialization.data(withJSONObject: ["application": app.path, "running": running.map { Int($0.processIdentifier) }])
            print(String(data: data, encoding: .utf8)!); NSApp.terminate(nil); return
        }
        if let existing = running.first {
            existing.unhide(); existing.activate(options: [.activateAllWindows])
            print("官方应用已在运行，仅激活已有窗口。完全退出后，再从此入口打开才会播放启动动画。")
            NSApp.terminate(nil); return
        }
        let check = Process()
        check.executableURL = URL(fileURLWithPath: "/usr/bin/codesign")
        check.arguments = ["--verify", "--deep", "--strict=symlinks", "-R", "=anchor apple generic and certificate leaf[subject.OU] = \"2DC432GLL2\"", app.path]
        do { try check.run(); check.waitUntilExit() }
        catch { fail("无法检查官方应用：\(error.localizedDescription)"); return }
        guard check.terminationStatus == 0 else { fail("官方应用签名检查未通过，未启动动画。"); return }
        let runner = Process(), output = Pipe()
        runner.executableURL = app.appendingPathComponent("Contents/Resources/cua_node/bin/node")
        runner.arguments = [Bundle.main.resourceURL!.appendingPathComponent("run.mjs").path, "--bundle", app.path]
        runner.standardOutput = output; runner.standardError = output
        runner.terminationHandler = { [weak self] task in
            let message = String(data: output.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? "启动失败"
            DispatchQueue.main.async {
                if task.terminationStatus == 0 { print(message); NSApp.terminate(nil) }
                else { self?.fail(message) }
            }
        }
        process = runner
        do { try runner.run() } catch { fail("无法启动动画：\(error.localizedDescription)") }
    }

    func showPreview() {
        NSApp.setActivationPolicy(.regular)
        let menu = NSMenu(), root = NSMenuItem(), appMenu = NSMenu()
        menu.addItem(root); root.submenu = appMenu
        appMenu.addItem(withTitle: "退出 \(appName) 预览", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        NSApp.mainMenu = menu
        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let width = min(1180, screen.width - 80), height = min(780, screen.height - 80)
        let win = NSWindow(contentRect: NSRect(x: 0, y: 0, width: width, height: height), styleMask: [.titled, .closable, .miniaturizable], backing: .buffered, defer: false)
        win.title = "\(appName) · 预览"
        win.isReleasedWhenClosed = false; win.delegate = self; win.center()
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(self, name: "splash")
        let view = WKWebView(frame: win.contentView!.bounds, configuration: config)
        view.autoresizingMask = [.width, .height]
        win.contentView = view
        web = view; window = win
        let resources = Bundle.main.resourceURL!
        view.loadFileURL(resources.appendingPathComponent(smoke ? "smoke-host.html" : "preview.html"), allowingReadAccessTo: resources)
        win.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
        watchdog = Timer.scheduledTimer(withTimeInterval: 35, repeats: false) { [weak self] _ in self?.fail("预览播放超时") }
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let text = message.body as? String else { return }
        print(text); fflush(stdout)
        if text.hasPrefix("ERROR:") { fail(text); return }
        if text == "STARTED" {
            for (index, seconds) in [4.5, 12.0].enumerated() {
                DispatchQueue.main.asyncAfter(deadline: .now() + seconds) { [weak self] in self?.snapshot(index) }
            }
            if CommandLine.arguments.contains("--test-skip") {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in self?.web?.evaluateJavaScript("window.previewPlayer.skip()") }
            }
            if CommandLine.arguments.contains("--test-stop") {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in self?.web?.evaluateJavaScript("window.previewPlayer.stop()") }
            }
        }
        if text == "COMPLETE" {
            completed = true; watchdog?.invalidate()
            web?.evaluateJavaScript("JSON.stringify({overlayRemoved:!document.querySelector('[data-codex-splash]'),originalFocusRestored:document.activeElement.id==='focus',temporaryAPIremoved:!('CodexSplash' in window),done:true})") { result, error in
                print("SMOKE RESULT: \(result ?? "missing") \(error?.localizedDescription ?? "")"); fflush(stdout)
                if self.smoke {
                    guard error == nil, let json = result as? String, let data = json.data(using: .utf8),
                          let state = try? JSONSerialization.jsonObject(with: data) as? [String: Bool],
                          state["overlayRemoved"] == true, state["originalFocusRestored"] == true,
                          state["temporaryAPIremoved"] == true else { self.fail("退场清理检查失败"); return }
                }
                NSApp.terminate(nil)
            }
        }
    }

    func snapshot(_ index: Int) {
        guard let arg = CommandLine.arguments.firstIndex(of: "--snapshots"), arg + 1 < CommandLine.arguments.count, !completed else { return }
        let path = URL(fileURLWithPath: CommandLine.arguments[arg + 1]).appendingPathComponent("splash-\(index).png")
        web?.takeSnapshot(with: nil) { image, error in
            guard let data = image?.tiffRepresentation, let bitmap = NSBitmapImageRep(data: data), let png = bitmap.representation(using: .png, properties: [:]) else { print("SNAPSHOT ERROR: \(String(describing: error))"); return }
            do { try png.write(to: path); print("SNAPSHOT: \(path.path)") } catch { print("SNAPSHOT ERROR: \(error)") }
        }
    }
    func windowWillClose(_ notification: Notification) { NSApp.terminate(nil) }
    func applicationWillTerminate(_ notification: Notification) {
        watchdog?.invalidate()
        web?.configuration.userContentController.removeScriptMessageHandler(forName: "splash")
    }
}
let app = NSApplication.shared
let delegate = Launcher()
app.delegate = delegate
app.run()
