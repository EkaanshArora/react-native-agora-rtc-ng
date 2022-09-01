require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-agora-rtc-ng"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "9.0" }
  s.source       = { :git => "https://github.com/AgoraIO-Community/react-native-agora-rtc-ng.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm}"

  s.dependency "React-Core"
#   s.dependency "AgoraRtcWrapper"
#   s.dependency 'AgoraRtcEngine_iOS', '4.0.0-rc.1'
  s.dependency 'AgoraIrisRTC_iOS', '4.0.0-beta.8'
  s.libraries = 'stdc++'
  s.framework = 'ReplayKit'
end
