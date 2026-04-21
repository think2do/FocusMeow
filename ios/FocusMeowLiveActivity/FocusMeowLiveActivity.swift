import ActivityKit
import SwiftUI
import UIKit
import WidgetKit

private let focusBackground = Color(red: 0.99, green: 0.96, blue: 0.88)
private let focusPrimary = Color(red: 0.69, green: 0.36, blue: 0.09)
private let focusInk = Color(red: 0.19, green: 0.16, blue: 0.13)
private let focusMuted = Color(red: 0.50, green: 0.43, blue: 0.34)
private let focusIslandIconBackground = Color.white

private func focusFormattedRemaining(_ seconds: Double) -> String {
  let safeSeconds = max(0, Int(seconds.rounded(.down)))
  let minutes = safeSeconds / 60
  let secs = safeSeconds % 60
  return String(format: "%02d:%02d", minutes, secs)
}

@available(iOSApplicationExtension 16.1, *)
private struct FocusLogoImage: View {
  let contentMode: ContentMode
  let scale: CGFloat
  let yOffset: CGFloat

  private final class BundleToken: NSObject {}

  init(contentMode: ContentMode = .fit, scale: CGFloat = 1, yOffset: CGFloat = 0) {
    self.contentMode = contentMode
    self.scale = scale
    self.yOffset = yOffset
  }

  private static func bundleCandidates() -> [Bundle] {
    let bundles = [
      Bundle.main,
      Bundle(for: BundleToken.self),
    ]
    var seen = Set<String>()
    return bundles.filter { bundle in
      let key = bundle.bundlePath
      guard !seen.contains(key) else { return false }
      seen.insert(key)
      return true
    }
  }

  private static func renderedLogo(from source: UIImage) -> UIImage {
    let canvasSize = CGSize(width: 160, height: 160)
    let format = UIGraphicsImageRendererFormat.default()
    format.opaque = false
    let renderer = UIGraphicsImageRenderer(size: canvasSize, format: format)
    return renderer.image { _ in
      let rect = CGRect(origin: .zero, size: canvasSize)
      let fillScale = max(rect.width / source.size.width, rect.height / source.size.height)
      let drawSize = CGSize(width: source.size.width * fillScale, height: source.size.height * fillScale)
      let drawOrigin = CGPoint(
        x: rect.midX - drawSize.width / 2,
        y: rect.midY - drawSize.height / 2 + 6
      )
      source.draw(in: CGRect(origin: drawOrigin, size: drawSize))
    }
  }

  private static let logo: UIImage? = {
    let namedCandidates = ["FocusLockLogo", "focus_lock_logo"]
    for bundle in bundleCandidates() {
      for name in namedCandidates {
        if let image = UIImage(named: name, in: bundle, compatibleWith: nil) {
          return renderedLogo(from: image)
        }
      }

      if let path = bundle.path(forResource: "focus_lock_logo", ofType: "png"),
         let image = UIImage(contentsOfFile: path) {
        return renderedLogo(from: image)
      }
    }

    return nil
  }()

  var body: some View {
    Group {
      if let logo = Self.logo {
        Image(uiImage: logo)
          .resizable()
          .renderingMode(.original)
          .interpolation(.high)
          .aspectRatio(contentMode: contentMode)
          .scaleEffect(scale)
          .offset(y: yOffset)
      } else {
        Text("🐱")
          .font(.system(size: 22))
      }
    }
  }
}

@available(iOSApplicationExtension 16.1, *)
private struct FocusIslandCountdownText: View {
  let context: ActivityViewContext<FocusSessionAttributes>
  let font: Font

  var body: some View {
    Group {
      if context.state.isPaused {
        Text(focusFormattedRemaining(context.state.pausedRemainingSeconds))
      } else {
        Text(timerInterval: Date()...context.state.endsAt, countsDown: true)
      }
    }
    .font(font)
    .monospacedDigit()
    .foregroundStyle(.white)
  }
}

@available(iOSApplicationExtension 16.1, *)
private struct FocusIslandIconBadge: View {
  let iconSize: CGFloat
  let badgeSize: CGFloat
  let cornerRadius: CGFloat

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        .fill(focusIslandIconBackground)
      FocusLogoImage(contentMode: .fill, scale: 1.55, yOffset: badgeSize * 0.05)
        .frame(width: iconSize, height: iconSize)
        .clipped()
    }
    .frame(width: badgeSize, height: badgeSize)
    .clipped()
  }
}

@available(iOSApplicationExtension 16.1, *)
private struct FocusCountdownView: View {
  let context: ActivityViewContext<FocusSessionAttributes>

  private var taskText: String {
    let task = context.state.task.trimmingCharacters(in: .whitespacesAndNewlines)
    if task.isEmpty {
      return context.state.lang == "zh" ? "专注进行中" : "Focusing"
    }
    return task
  }

  @ViewBuilder
  private var countdownText: some View {
    if context.state.isPaused {
      Text(focusFormattedRemaining(context.state.pausedRemainingSeconds))
    } else {
      Text(timerInterval: Date()...context.state.endsAt, countsDown: true)
    }
  }

  var body: some View {
    HStack(spacing: 12) {
      FocusLogoImage()
      .frame(width: 48, height: 48)

      VStack(alignment: .leading, spacing: 4) {
        Text(context.state.isPaused ? (context.state.lang == "zh" ? "已暂停" : "Paused") : (context.state.lang == "zh" ? "专注中" : "Focusing"))
          .font(.system(size: 13, weight: .bold))
          .foregroundStyle(focusPrimary)

        Text(taskText)
          .font(.system(size: 16, weight: .bold))
          .foregroundStyle(focusInk)
          .lineLimit(1)

        Text(context.state.lang == "zh" ? "保持专注" : "Stay present")
          .font(.system(size: 11, weight: .medium))
          .foregroundStyle(focusMuted)
          .lineLimit(1)
      }

      Spacer(minLength: 8)

      VStack(alignment: .trailing, spacing: 2) {
        countdownText
          .font(.system(size: 30, weight: .black, design: .rounded))
          .monospacedDigit()
          .foregroundStyle(focusInk)

        Text(context.state.lang == "zh" ? "剩余" : "LEFT")
          .font(.system(size: 10, weight: .bold))
          .tracking(1.6)
          .foregroundStyle(focusMuted)
      }
      .multilineTextAlignment(.trailing)
    }
    .padding(.horizontal, 18)
    .padding(.vertical, 13)
  }
}

@available(iOSApplicationExtension 16.1, *)
struct FocusMeowLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: FocusSessionAttributes.self) { context in
      FocusCountdownView(context: context)
        .activityBackgroundTint(focusBackground)
        .activitySystemActionForegroundColor(focusPrimary)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          HStack(spacing: 8) {
            FocusIslandIconBadge(iconSize: 12, badgeSize: 18, cornerRadius: 5)
            FocusIslandCountdownText(
              context: context,
              font: .system(size: 15, weight: .bold, design: .rounded)
            )
          }
        }
      } compactLeading: {
        FocusIslandIconBadge(iconSize: 10, badgeSize: 16, cornerRadius: 4.5)
      } compactTrailing: {
        FocusIslandCountdownText(
          context: context,
          font: .system(size: 12, weight: .bold, design: .rounded)
        )
        .frame(minWidth: 30, maxWidth: 32, alignment: .trailing)
      } minimal: {
        FocusIslandIconBadge(iconSize: 10, badgeSize: 16, cornerRadius: 4.5)
      }
      .keylineTint(focusPrimary)
    }
  }
}

@main
struct FocusMeowLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    if #available(iOSApplicationExtension 16.1, *) {
      FocusMeowLiveActivity()
    }
  }
}
