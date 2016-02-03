---
layout: post
permalink: /2014/01/03/inspecting-third-party-apps.html
title: Inspecting Third Party Apps
category : Programming
tags: [programming, Objective-C]
comments: true
showads: true
---

### An Alternative Approach

This post is an overview of an alternative approach to attaching [Reveal](http://revealapp.com/) or [Spark](http://www.sparkinspector.com/) to third party apps on a jailbroken device. Peter Steinberger posted a [blog post](http://petersteinberger.com/blog/2013/how-to-inspect-the-view-hierarchy-of-3rd-party-apps/) demonstrating how this works using MobileSubstrate. Unfortunately, this approach didn't work for me and a few others that shared my woes via Twitter.

<!-- more -->

As Peter said in his blog post, the iOS7 jailbreak will allow us to attach the debugger to 3rd party apps in order to study the view heirarchy of complex apps. This will provide developers with insight to how others have approached similar problems.[¹](http://petersteinberger.com/blog/2013/how-to-inspect-the-view-hierarchy-of-3rd-party-apps/)

### Jailbreak + Setup

Although Peter's post can get you 90% of the way, I'll reiterate his steps here to save you an extra tab in your browser.

1. I jailbroke my iPad 3 using the 1.0.1 version of [evasi0n's app](http://evasi0n.com/).
2. Be sure to install OpenSSH. Once installed, make sure you can ssh into your device via `ssh root@192.168.1.102` using the default password `alpine`. Obviously you should replace this example IP address with your device's wifi address.
3. Next, we'll copy our libReveal.dlylib and our libSpark.dlyib files onto our device. It doesn't really matter where the files are copied to on the device, but since I started down the path of using MobileSubstrate, I ended up copying both files to its DynamicLibraries directory: `scp /Applications/Reveal.app/Contents/SharedSupport/iOS-Libraries/libReveal.dylib root@192.168.1.102:/Library/MobileSubstrate/DynamicLibraries` and `scp "/Applications/Spark Inspector.app/Contents/Resources/Frameworks/SparkInspector.dylib" root@192.168.1.102:/Library/MobileSubstrate/DynamicLibraries`.

Beyond this, if Mobile Substrate works for you, then there is no need to go any further. But for the rest of us, we'll have to resort to other options.

### DYLD FTW

Thankfully, it is possible to perform code injection using the [dynamic linker](https://developer.apple.com/library/mac/documentation/Darwin/Reference/Manpages/man1/dyld.1.html). Using the environment variable `DYLD_INSERT_LIBRARIES`, we can inject Reveal and/or Spark into 3rd party applications on the device. According to the man page, this environment variable is:[²](https://developer.apple.com/library/mac/documentation/Darwin/Reference/Manpages/man1/dyld.1.html)

    DYLD_INSERT_LIBRARIES
        This  is  a colon separated list of dynamic libraries to load before the ones specified in the
        program.  This lets you test new modules of existing dynamic shared libraries that are used in
        flat-namespace images by loading a temporary dynamic shared library with just the new modules.
        Note that this has no effect on images built a two-level  namespace  images  using  a  dynamic
        shared library unless DYLD_FORCE_FLAT_NAMESPACE is also used.

Knowing this, all we need to do is set the environment variable to our dylib path and we will be good to go. To inject Reveal, copy this into your ssh terminal.

```
launchctl setenv DYLD_INSERT_LIBRARIES /Library/MobileSubstrate/DynamicLibraries/libReveal.dylib
launchctl setenv DYLD_FORCE_FLAT_NAMESPACE ''
```

As of this post, Reveal is having trouble attaching to and inspecting Springboard. Thankfully, Spark Inspector is able to take on the load of Springboard, so if you wish to inject both libraries, you can also do that by using a colon separated list of libraries.

```
launchctl setenv DYLD_INSERT_LIBRARIES /Library/MobileSubstrate/DynamicLibraries/libReveal.dylib:/Library/MobileSubstrate/DynamicLibraries/SparkInspector.dylib
launchctl setenv DYLD_FORCE_FLAT_NAMESPACE ''
```

Once you have this set, that's really all you need to do. Launch an app to get started. If you want to inspect Springboard you'll have to restart the device first. I use `sbreload` from the UIKitTools Cydia package, but `killall SpringBoard` should work too.

The good thing about this approach is that it doesn't require MobileSubstrate and it works on ARM and ARM64, as [verified](https://twitter.com/hjaltij/status/419154290453008384) via Twitter.

### References

* [[1] How to Inspect the View Hierarchy of 3rd-party Apps](http://petersteinberger.com/blog/2013/how-to-inspect-the-view-hierarchy-of-3rd-party-apps/)
* [[2] DYLD(1)](https://developer.apple.com/library/mac/documentation/Darwin/Reference/Manpages/man1/dyld.1.html)