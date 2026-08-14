import AppKit
import Foundation
import Sparkle

@MainActor
final class CodexionAppDelegate: NSObject, NSApplicationDelegate {
    private let updaterController = SPUStandardUpdaterController(
        startingUpdater: true,
        updaterDelegate: nil,
        userDriverDelegate: nil
    )
    private var coreProcess: Process?
    private var monitorTimer: Timer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        do {
            try launchCore()
        } catch {
            let alert = NSAlert()
            alert.alertStyle = .critical
            alert.messageText = "Codexion could not start"
            alert.informativeText = error.localizedDescription
            alert.runModal()
            NSApp.terminate(nil)
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        monitorTimer?.invalidate()
        if let process = coreProcess, process.isRunning {
            process.terminate()
        }
    }

    private func launchCore() throws {
        guard let executableURL = Bundle.main.executableURL else {
            throw LauncherError.missingBundleExecutable
        }

        let coreURL = executableURL.deletingLastPathComponent().appendingPathComponent("CodexionCore")
        guard FileManager.default.isExecutableFile(atPath: coreURL.path) else {
            throw LauncherError.missingCore(coreURL.path)
        }

        let process = Process()
        process.executableURL = coreURL
        process.arguments = Array(CommandLine.arguments.dropFirst())
        process.environment = coreEnvironment()
        try process.run()
        coreProcess = process

        monitorTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] timer in
            guard let self else {
                timer.invalidate()
                return
            }
            MainActor.assumeIsolated {
                guard let coreProcess = self.coreProcess, !coreProcess.isRunning else { return }
                timer.invalidate()
                NSApp.terminate(nil)
            }
        }
    }

    private func coreEnvironment() -> [String: String] {
        var environment = ProcessInfo.processInfo.environment
        let existing = environment["PATH", default: "/usr/bin:/bin:/usr/sbin:/sbin"]
        let preferred = ["/opt/homebrew/bin", "/opt/homebrew/sbin", "/usr/local/bin"]
        let entries = existing.split(separator: ":").map(String.init)
        environment["PATH"] = (preferred + entries).reduce(into: [String]()) { result, entry in
            if !result.contains(entry) { result.append(entry) }
        }.joined(separator: ":")
        return environment
    }
}

enum LauncherError: LocalizedError {
    case missingBundleExecutable
    case missingCore(String)

    var errorDescription: String? {
        switch self {
        case .missingBundleExecutable:
            return "The app bundle has no launcher executable."
        case .missingCore(let path):
            return "The Codexion core executable is missing at \(path)."
        }
    }
}

@main
@MainActor
struct CodexionLauncher {
    static func main() {
        let app = NSApplication.shared
        let delegate = CodexionAppDelegate()
        app.setActivationPolicy(.accessory)
        app.delegate = delegate
        app.run()
        withExtendedLifetime(delegate) {}
    }
}
