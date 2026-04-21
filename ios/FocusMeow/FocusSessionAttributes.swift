import Foundation

#if canImport(ActivityKit)
import ActivityKit

@available(iOS 16.1, *)
struct FocusSessionAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var startedAt: Date
    var endsAt: Date
    var task: String
    var lang: String
    var isPaused: Bool
    var pausedRemainingSeconds: Double
  }

  var sessionId: String
  var task: String
  var lang: String
}
#endif
