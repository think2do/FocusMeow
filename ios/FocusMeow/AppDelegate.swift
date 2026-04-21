import UIKit
import AVFoundation
import MediaPlayer
import UserNotifications
#if canImport(ActivityKit)
import ActivityKit
#endif
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    UNUserNotificationCenter.current().delegate = self

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

#if DEBUG
    RCTDevLoadingViewSetEnabled(false)
#endif

    factory.startReactNative(
      withModuleName: "FocusMeow",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .list, .sound])
    } else {
      completionHandler([.alert, .sound])
    }
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

}

@objc(AmbientAudio)
class AmbientAudio: NSObject, RCTBridgeModule {
  private var audioPlayer: AVAudioPlayer?
  private var sfxPlayer: AVAudioPlayer?
  private var queuePlayer: AVQueuePlayer?
  private var looper: AVPlayerLooper?
  private let bundledTracks: [String: (name: String, ext: String)] = [
    "rain": ("light-rain-loop", "wav"),
    "night": ("night-forest-with-insects", "wav"),
    "bird": ("bird-sound", "wav"),
  ]
  private let bundledSfx: [String: (name: String, ext: String)] = [
    "catSwitch": ("cat-switch", "wav"),
    "petCat": ("cat-pet-meow", "wav"),
    "teaseCat": ("cat-tease-meow", "mp3"),
    "hungry": ("focus-interrupt-hungry", "wav"),
    "dead": ("focus-runaway-angry", "wav"),
  ]

  static func moduleName() -> String! {
    "AmbientAudio"
  }

  static func requiresMainQueueSetup() -> Bool {
    true
  }

  private func stopPlayers() {
    audioPlayer?.stop()
    audioPlayer = nil
    queuePlayer?.pause()
    queuePlayer?.removeAllItems()
    queuePlayer = nil
    looper = nil
  }

  private func bundledTrackURL(for trackKey: String) -> URL? {
    guard let resource = bundledTracks[trackKey] else { return nil }
    return Bundle.main.url(forResource: resource.name, withExtension: resource.ext)
  }

  private func bundledSfxURL(for effectKey: String) -> URL? {
    guard let resource = bundledSfx[effectKey] else { return nil }
    return Bundle.main.url(forResource: resource.name, withExtension: resource.ext)
  }

  private func configureAudioSession() throws {
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.playback, options: [.mixWithOthers])
    try session.setActive(true)
  }

  @objc(playTrack:uriString:resolver:rejecter:)
  func playTrack(
    _ trackKey: String,
    uriString: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      do {
        try self.configureAudioSession()
        self.stopPlayers()

        if let localURL = self.bundledTrackURL(for: trackKey) {
          let player = try AVAudioPlayer(contentsOf: localURL)
          player.numberOfLoops = -1
          player.volume = 0.72
          player.prepareToPlay()
          player.play()
          self.audioPlayer = player
          resolve(true)
          return
        }

        guard let uriString, let url = URL(string: uriString) else {
          reject("missing_track", "Ambient track resource was not found", nil)
          return
        }

        let item = AVPlayerItem(url: url)
        let queuePlayer = AVQueuePlayer()
        self.looper = AVPlayerLooper(player: queuePlayer, templateItem: item)
        self.queuePlayer = queuePlayer
        queuePlayer.volume = 0.72
        queuePlayer.play()
        resolve(true)
      } catch {
        reject("play_failed", "Failed to play ambient audio", error)
      }
    }
  }

  @objc(play:resolver:rejecter:)
  func play(_ uriString: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let url = URL(string: uriString) else {
        reject("invalid_uri", "Invalid audio URI", nil)
        return
      }

      do {
        try self.configureAudioSession()
        self.stopPlayers()

        let item = AVPlayerItem(url: url)
        let queuePlayer = AVQueuePlayer()
        self.looper = AVPlayerLooper(player: queuePlayer, templateItem: item)
        self.queuePlayer = queuePlayer
        queuePlayer.volume = 0.72
        queuePlayer.play()
        resolve(true)
      } catch {
        reject("play_failed", "Failed to play ambient audio", error)
      }
    }
  }

  @objc(playSfx:uriString:resolver:rejecter:)
  func playSfx(
    _ effectKey: String,
    uriString: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      do {
        try self.configureAudioSession()

        let audioURL: URL?
        if let bundledURL = self.bundledSfxURL(for: effectKey) {
          audioURL = bundledURL
        } else if let uriString = uriString {
          audioURL = URL(string: uriString)
        } else {
          audioURL = nil
        }

        guard let localURL = audioURL else {
          reject("missing_sfx", "Sound effect resource was not found", nil)
          return
        }

        let player = try AVAudioPlayer(contentsOf: localURL)
        player.numberOfLoops = 0
        player.volume = effectKey == "teaseCat" ? 1.0 : 0.85
        player.prepareToPlay()
        player.play()
        self.sfxPlayer = player
        resolve(true)
      } catch {
        reject("sfx_failed", "Failed to play sound effect", error)
      }
    }
  }

  @objc(stop:rejecter:)
  func stop(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.stopPlayers()
      resolve(true)
    }
  }
}

@objc(FocusSessionActivity)
class FocusSessionActivity: NSObject, RCTBridgeModule {
  private let reminderIdentifier = "focusmeow.focus.reminder"
  private var deviceLockedDuringFocus = false
  private var systemInterruptedDuringFocus = false
  private var systemInterruptionBeganAt: Date?
  private var accumulatedSystemPausedMs: Double = 0
  private var reminderGeneration = 0
  private var reminderBackgroundTask: UIBackgroundTaskIdentifier = .invalid

  override init() {
    super.init()
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleProtectedDataUnavailable),
      name: UIApplication.protectedDataWillBecomeUnavailableNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleAudioSessionInterruption),
      name: AVAudioSession.interruptionNotification,
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  static func moduleName() -> String! {
    "FocusSessionActivity"
  }

  static func requiresMainQueueSetup() -> Bool {
    true
  }

  private func configureAudioSession() {
    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playback, options: [.mixWithOthers])
      try session.setActive(true)
    } catch {
      print("[FocusSessionActivity] audio session failed: \(error.localizedDescription)")
    }
  }

  private func lockScreenLogoImage() -> UIImage? {
    if let image = UIImage(named: "FocusLockLogo") {
      return image
    }

    if let path = Bundle.main.path(forResource: "focus_lock_logo", ofType: "png") {
      return UIImage(contentsOfFile: path)
    }

    return UIImage(named: "LaunchLogo")
      ?? UIImage(named: "launch_logo")
      ?? UIImage(named: "AppIcon")
  }

  private func lockScreenArtworkImage(from logo: UIImage) -> UIImage {
    let canvasSize = CGSize(width: 512, height: 512)
    let format = UIGraphicsImageRendererFormat.default()
    format.opaque = false
    let renderer = UIGraphicsImageRenderer(size: canvasSize, format: format)
    return renderer.image { context in
      let rect = CGRect(origin: .zero, size: canvasSize)
      context.cgContext.clear(rect)
      let inset: CGFloat = 22
      let imageRect = rect.insetBy(dx: inset, dy: inset)
      let aspect = min(imageRect.width / logo.size.width, imageRect.height / logo.size.height)
      let drawSize = CGSize(width: logo.size.width * aspect, height: logo.size.height * aspect)
      let drawOrigin = CGPoint(
        x: rect.midX - drawSize.width / 2,
        y: rect.midY - drawSize.height / 2
      )
      logo.draw(in: CGRect(origin: drawOrigin, size: drawSize))
    }
  }

  private func setNowPlayingInfo(title: String, subtitle: String, durationSeconds: NSNumber, elapsedSeconds: NSNumber) {
    let duration = max(0, durationSeconds.doubleValue)
    let elapsed = min(duration, max(0, elapsedSeconds.doubleValue))
    var info: [String: Any] = [
      MPMediaItemPropertyTitle: title,
      MPMediaItemPropertyArtist: subtitle,
      MPMediaItemPropertyAlbumTitle: "Focus Meow",
      MPMediaItemPropertyPlaybackDuration: duration,
      MPNowPlayingInfoPropertyElapsedPlaybackTime: elapsed,
      MPNowPlayingInfoPropertyPlaybackRate: 1.0,
    ]
    if let logo = lockScreenLogoImage() {
      let artwork = lockScreenArtworkImage(from: logo)
      info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: artwork.size) { _ in artwork }
    }
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
  }

  @objc private func handleProtectedDataUnavailable() {
    deviceLockedDuringFocus = true
    cancelFocusReminder()
  }

  @objc private func handleAudioSessionInterruption(_ notification: Notification) {
    guard
      let info = notification.userInfo,
      let rawType = info[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: rawType)
    else {
      return
    }

    switch type {
    case .began:
      systemInterruptedDuringFocus = true
      if systemInterruptionBeganAt == nil {
        systemInterruptionBeganAt = Date()
      }
      cancelFocusReminder()
      #if canImport(ActivityKit)
      if #available(iOS 16.1, *) {
        pauseLiveActivityForSystemInterruption()
      }
      #endif
      pauseNowPlayingForSystemInterruption()
    case .ended:
      let pausedSeconds = finishSystemInterruptionPause()
      #if canImport(ActivityKit)
      if #available(iOS 16.1, *), pausedSeconds > 0 {
        resumeLiveActivityAfterSystemInterruption(pausedSeconds: pausedSeconds)
      }
      #endif
      resumeNowPlayingAfterSystemInterruption()
    @unknown default:
      return
    }
  }

  private func cancelFocusReminder() {
    reminderGeneration += 1
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [reminderIdentifier])
    UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [reminderIdentifier])
    if reminderBackgroundTask != .invalid {
      UIApplication.shared.endBackgroundTask(reminderBackgroundTask)
      reminderBackgroundTask = .invalid
    }
  }

  private func pauseNowPlayingForSystemInterruption() {
    var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
    info[MPNowPlayingInfoPropertyPlaybackRate] = 0.0
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
  }

  private func resumeNowPlayingAfterSystemInterruption() {
    var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
    info[MPNowPlayingInfoPropertyPlaybackRate] = 1.0
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
  }

  private func finishSystemInterruptionPause() -> TimeInterval {
    guard let beganAt = systemInterruptionBeganAt else {
      return 0
    }

    let pausedSeconds = max(0, Date().timeIntervalSince(beganAt))
    accumulatedSystemPausedMs += pausedSeconds * 1000
    systemInterruptionBeganAt = nil
    return pausedSeconds
  }

  private func consumeSystemPausedMs() -> Double {
    let activePausedMs: Double
    if let beganAt = systemInterruptionBeganAt {
      activePausedMs = max(0, Date().timeIntervalSince(beganAt)) * 1000
      systemInterruptionBeganAt = nil
    } else {
      activePausedMs = 0
    }

    let totalPausedMs = max(0, accumulatedSystemPausedMs + activePausedMs)
    accumulatedSystemPausedMs = 0
    return totalPausedMs
  }

  private func cleanTask(from subtitle: String) -> String {
    subtitle
      .replacingOccurrences(of: "当前任务：", with: "")
      .replacingOccurrences(of: "Task: ", with: "")
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }

  #if canImport(ActivityKit)
  @available(iOS 16.1, *)
  private func currentActivity() -> Activity<FocusSessionAttributes>? {
    Activity<FocusSessionAttributes>.activities.first
  }

  @available(iOS 16.1, *)
  private func buildLiveActivityState(
    subtitle: String,
    durationSeconds: NSNumber,
    elapsedSeconds: NSNumber
  ) -> FocusSessionAttributes.ContentState {
    let duration = max(1, durationSeconds.doubleValue)
    let elapsed = min(duration, max(0, elapsedSeconds.doubleValue))
    let now = Date()
    let startedAt = now.addingTimeInterval(-elapsed)
    let endsAt = startedAt.addingTimeInterval(duration)
    return FocusSessionAttributes.ContentState(
      startedAt: startedAt,
      endsAt: max(endsAt, now.addingTimeInterval(1)),
      task: cleanTask(from: subtitle),
      lang: subtitle.contains("当前任务") || subtitle.contains("专注") ? "zh" : "en",
      isPaused: false,
      pausedRemainingSeconds: 0
    )
  }

  @available(iOS 16.1, *)
  private func pauseLiveActivityForSystemInterruption() {
    guard let activity = currentActivity() else { return }

    Task {
      let state: FocusSessionAttributes.ContentState
      if #available(iOS 16.2, *) {
        state = activity.content.state
      } else {
        state = activity.contentState
      }

      let remainingSeconds = max(0, state.endsAt.timeIntervalSince(Date()))
      let pausedState = FocusSessionAttributes.ContentState(
        startedAt: state.startedAt,
        endsAt: Date().addingTimeInterval(max(1, remainingSeconds)),
        task: state.task,
        lang: state.lang,
        isPaused: true,
        pausedRemainingSeconds: remainingSeconds
      )

      if #available(iOS 16.2, *) {
        await activity.update(ActivityContent(state: pausedState, staleDate: nil))
      } else {
        await activity.update(using: pausedState)
      }
    }
  }

  @available(iOS 16.1, *)
  private func resumeLiveActivityAfterSystemInterruption(pausedSeconds: TimeInterval) {
    guard let activity = currentActivity(), pausedSeconds > 0 else { return }

    Task {
      let state: FocusSessionAttributes.ContentState
      if #available(iOS 16.2, *) {
        state = activity.content.state
      } else {
        state = activity.contentState
      }

      let resumedState = FocusSessionAttributes.ContentState(
        startedAt: state.startedAt.addingTimeInterval(pausedSeconds),
        endsAt: state.endsAt.addingTimeInterval(pausedSeconds),
        task: state.task,
        lang: state.lang,
        isPaused: false,
        pausedRemainingSeconds: 0
      )

      if #available(iOS 16.2, *) {
        await activity.update(ActivityContent(state: resumedState, staleDate: resumedState.endsAt))
      } else {
        await activity.update(using: resumedState)
      }
    }
  }

  @available(iOS 16.1, *)
  private func startLiveActivity(
    subtitle: String,
    durationSeconds: NSNumber,
    elapsedSeconds: NSNumber
  ) {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

    Task {
      do {
        if let existing = currentActivity() {
          if #available(iOS 16.2, *) {
            await existing.end(nil, dismissalPolicy: .immediate)
          } else {
            await existing.end(using: nil, dismissalPolicy: .immediate)
          }
        }

        let state = buildLiveActivityState(
          subtitle: subtitle,
          durationSeconds: durationSeconds,
          elapsedSeconds: elapsedSeconds
        )
        let attributes = FocusSessionAttributes(
          sessionId: UUID().uuidString,
          task: state.task,
          lang: state.lang
        )

        if #available(iOS 16.2, *) {
          let content = ActivityContent(state: state, staleDate: state.endsAt)
          _ = try Activity<FocusSessionAttributes>.request(
            attributes: attributes,
            content: content,
            pushType: nil
          )
        } else {
          _ = try Activity<FocusSessionAttributes>.request(
            attributes: attributes,
            contentState: state,
            pushType: nil
          )
        }
      } catch {
        print("[FocusSessionActivity] live activity start failed: \(error.localizedDescription)")
      }
    }
  }

  @available(iOS 16.1, *)
  private func updateLiveActivity(
    subtitle: String,
    durationSeconds: NSNumber,
    elapsedSeconds: NSNumber
  ) {
    guard let activity = currentActivity() else { return }
    let state = buildLiveActivityState(
      subtitle: subtitle,
      durationSeconds: durationSeconds,
      elapsedSeconds: elapsedSeconds
    )

    Task {
      if #available(iOS 16.2, *) {
        await activity.update(ActivityContent(state: state, staleDate: state.endsAt))
      } else {
        await activity.update(using: state)
      }
    }
  }

  @available(iOS 16.1, *)
  private func stopLiveActivity() {
    guard let activity = currentActivity() else { return }

    Task {
      if #available(iOS 16.2, *) {
        await activity.end(nil, dismissalPolicy: .immediate)
      } else {
        await activity.end(using: nil, dismissalPolicy: .immediate)
      }
    }
  }
  #endif

  private func requestReminderAuthorization(completion: @escaping (Bool) -> Void) {
    let center = UNUserNotificationCenter.current()
    center.getNotificationSettings { settings in
      switch settings.authorizationStatus {
      case .authorized, .provisional:
        completion(true)
      case .denied:
        completion(false)
      case .notDetermined:
        center.requestAuthorization(options: [.alert, .sound]) { granted, error in
          if let error = error {
            print("[FocusSessionActivity] notification permission failed: \(error.localizedDescription)")
          }
          completion(granted)
        }
      @unknown default:
        completion(false)
      }
    }
  }

  @objc(start:subtitle:durationSeconds:elapsedSeconds:resolver:rejecter:)
  func start(
    _ title: String,
    subtitle: String,
    durationSeconds: NSNumber,
    elapsedSeconds: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
 ) {
    DispatchQueue.main.async {
      self.configureAudioSession()
      self.deviceLockedDuringFocus = false
      self.systemInterruptedDuringFocus = false
      self.systemInterruptionBeganAt = nil
      self.accumulatedSystemPausedMs = 0
      self.cancelFocusReminder()
      UIApplication.shared.beginReceivingRemoteControlEvents()
      self.setNowPlayingInfo(
        title: title,
        subtitle: subtitle,
        durationSeconds: durationSeconds,
        elapsedSeconds: elapsedSeconds
      )
      #if canImport(ActivityKit)
      if #available(iOS 16.1, *) {
        self.startLiveActivity(
          subtitle: subtitle,
          durationSeconds: durationSeconds,
          elapsedSeconds: elapsedSeconds
        )
      }
      #endif
      resolve(true)
    }
  }

  @objc(prepareReminderPermission:rejecter:)
  func prepareReminderPermission(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    requestReminderAuthorization { granted in
      resolve(granted)
    }
  }

  @objc(consumeDeviceLockFlag:rejecter:)
  func consumeDeviceLockFlag(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      let wasLocked = self.deviceLockedDuringFocus || self.systemInterruptedDuringFocus
      self.deviceLockedDuringFocus = false
      self.systemInterruptedDuringFocus = false
      resolve(wasLocked)
    }
  }

  @objc(consumeFocusInterruptionContext:rejecter:)
  func consumeFocusInterruptionContext(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      let context: String
      if self.systemInterruptedDuringFocus {
        let pausedMs = Int(self.consumeSystemPausedMs().rounded())
        context = "system:\(pausedMs)"
      } else if self.deviceLockedDuringFocus {
        context = "lock"
      } else {
        context = "none"
      }
      self.deviceLockedDuringFocus = false
      self.systemInterruptedDuringFocus = false
      resolve(context)
    }
  }

  @objc(remind:body:resolver:rejecter:)
  func remind(
    _ title: String,
    body: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    requestReminderAuthorization { granted in
      guard granted else {
        resolve(false)
        return
      }

      let center = UNUserNotificationCenter.current()
      let content = UNMutableNotificationContent()
      content.title = title
      content.body = body
      content.sound = .default
      content.threadIdentifier = "focusmeow.focus"

      let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
      let request = UNNotificationRequest(
        identifier: self.reminderIdentifier,
        content: content,
        trigger: trigger
      )

      center.removePendingNotificationRequests(withIdentifiers: [self.reminderIdentifier])
      center.removeDeliveredNotifications(withIdentifiers: [self.reminderIdentifier])
      center.add(request) { error in
        if let error = error {
          reject("reminder_failed", "Failed to schedule focus reminder", error)
          return
        }
        resolve(true)
      }
    }
  }

  @objc(remindAfter:body:delaySeconds:resolver:rejecter:)
  func remindAfter(
    _ title: String,
    body: String,
    delaySeconds: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    requestReminderAuthorization { granted in
      guard granted else {
        resolve(false)
        return
      }

      DispatchQueue.main.async {
        self.cancelFocusReminder()
        self.reminderGeneration += 1
        let generation = self.reminderGeneration
        let delay = max(0.2, delaySeconds.doubleValue)

        self.reminderBackgroundTask = UIApplication.shared.beginBackgroundTask(withName: "FocusMeowReminder") {
          if self.reminderBackgroundTask != .invalid {
            UIApplication.shared.endBackgroundTask(self.reminderBackgroundTask)
            self.reminderBackgroundTask = .invalid
          }
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
          guard generation == self.reminderGeneration else {
            resolve(false)
            return
          }

          defer {
            if self.reminderBackgroundTask != .invalid {
              UIApplication.shared.endBackgroundTask(self.reminderBackgroundTask)
              self.reminderBackgroundTask = .invalid
            }
          }

          guard UIApplication.shared.applicationState != .active,
                !self.deviceLockedDuringFocus,
                !self.systemInterruptedDuringFocus
          else {
            resolve(false)
            return
          }

          let content = UNMutableNotificationContent()
          content.title = title
          content.body = body
          content.sound = .default
          content.threadIdentifier = "focusmeow.focus"

          let request = UNNotificationRequest(
            identifier: self.reminderIdentifier,
            content: content,
            trigger: nil
          )

          UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
              reject("reminder_failed", "Failed to schedule delayed focus reminder", error)
              return
            }
            resolve(true)
          }
        }
      }
    }
  }

  @objc(cancelReminder:rejecter:)
  func cancelReminder(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.cancelFocusReminder()
      resolve(true)
    }
  }

  @objc(update:subtitle:durationSeconds:elapsedSeconds:resolver:rejecter:)
  func update(
    _ title: String,
    subtitle: String,
    durationSeconds: NSNumber,
    elapsedSeconds: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      if self.systemInterruptionBeganAt != nil {
        self.pauseNowPlayingForSystemInterruption()
        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
          self.pauseLiveActivityForSystemInterruption()
        }
        #endif
        resolve(true)
        return
      }

      var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
      info[MPMediaItemPropertyTitle] = title
      info[MPMediaItemPropertyArtist] = subtitle
      info[MPMediaItemPropertyPlaybackDuration] = max(0, durationSeconds.doubleValue)
      info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = max(0, elapsedSeconds.doubleValue)
      info[MPNowPlayingInfoPropertyPlaybackRate] = 1.0
      MPNowPlayingInfoCenter.default().nowPlayingInfo = info
      #if canImport(ActivityKit)
      if #available(iOS 16.1, *) {
        self.updateLiveActivity(
          subtitle: subtitle,
          durationSeconds: durationSeconds,
          elapsedSeconds: elapsedSeconds
        )
      }
      #endif
      resolve(true)
    }
  }

  @objc(stop:rejecter:)
  func stop(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
      UIApplication.shared.endReceivingRemoteControlEvents()
      self.cancelFocusReminder()
      #if canImport(ActivityKit)
      if #available(iOS 16.1, *) {
        self.stopLiveActivity()
      }
      #endif
      resolve(true)
    }
  }
}
