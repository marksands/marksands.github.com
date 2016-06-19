---
layout: post
permalink: /2016/6/19/wwdc-2016-what-you-might-have-missed.html
title: WWDC 2016 What You Might Have Missed
category : Programming
tags: [iOS, WWDC]
comments: true
showads: true
---

I was fortunate enough to attend WWDC 2016 this year having scored a lucky [golden ticket](https://www.youtube.com/watch?v=6AicW3Xp9EM). The week was mostly a blur, but I still had a blast and met a lot of really freaking cool people. Since I know first hand how hard it was to keep track of all the shiny new things Apple announced, I figured it would be worthwhile to point out some new technical features that you may have already forgotten about or not heard at all.

<!-- more -->

### Apple open sources LZFSE

First up, Apple [open sources](https://github.com/lzfse/lzfse) their LZFSE compression library and command line tool. This is a welcome surprise. LZFSE was previously a no-go if you were sharing the compression payload across platforms, since it was locked down to iOS 9 and OS X 10.11 only, but now that it’s open source it can support both linux and windows, among others.

### UIAutomation is deprecated

No more JavaScript, for now. This shouldn’t be too surprising with the release of XCUITests last year. It doesn’t make sense for Apple to support two methods of UI testing at the very least. I hope no one has invested too much of their time into Automation because it has been removed from Instruments in Xcode 8.

### Single Sign On for tvOS

Say goodbye to Adobe Primetime (formerly Adobe Pass) for TV Everywhere. Single Sign On is a welcome addition to the platform. Users of tvOS know the struggle of authenticating each individual TV content provider app over and over again, and now we only get to do this once.

I haven’t read a lot of details on this feature yet, so my assumption is that content providers will have to opt in to this feature. We likely won’t see this feature widely used for a while, but I hope I’m proven wrong.

### Official Xcode Plugins

This probably isn’t unheard news, I’m just super excited about this feature. Xcode finally has an official API for extensions. Currently it’s just limited to source editor extensions, but I have hope that this can only get better. As a bonus, you can distribute Xcode extensions on the MAS or sign them and distribute them however you want.

As an aside, if you currently support a source editor Xcode plugin through Alcatraz, then you should consider porting it over as an extension. According to [Joe Groff](https://twitter.com/jckarter/status/742471686935568384), “Xcode 8 uses library validation. It won't load in-process plugins anymore.” So there’s that.

### APFS

_Ding!_ This also isn’t news, but it’s worth mentioning in case you were living under a rock last week. Apple announced their new file system coming in 2017, and it sounds very promising. It’s available as a developer preview in macOS Seirra if you feel daring.

### Developer Certificates available per-machine

This is wonderful news. Now that development certificates are available to each machine, rather than restricted to a single one per account, there is no need to transfer private keys between development machines. Developers will no longer get upset when someone clicks the Fix Issue button.

### iCloud outside of MAS

iCloud is now available for Mac apps signed and distributed outside the Mac App Store. If you think this sounds crazy, that’s because it does. This is not a typical Apple move, but holy cow awesome. Hopefully we’ll start seeing more and more apps outside of the MAS enable iCloud sync.

### CloudKit Sharing

CloudKit now supports sharing functionality. As an example, Apple showed the new sharing functionality in the Notes app on macOS. This has a lot of potential to be really great for teams and families. No family photo library sharing yet, but maybe next year.

### ISO8601

At last, `ISO8601DateFormatter` exists in Foundation. For decades, date and time has plagued developers with subtle bugs. Parsing and formatting ISO 8601 dates were especially tricky because time zones. Thankfully, it only took Apple 9 developer releases to add this date formatter.

### Neural Networks, Game AI, and more

GameplayKit and Accelerate introduced a plethora of goodies for AI aficionados. GameplayKit introduces Agents, Procedural Generation, Pathfinding, Monte Carlo Simulations, and more. These new APIs aren’t limited to games and can make for some interesting solutions in other genres. For instance, the new `GKQuadTree` can be used to improve performance for pin clustering in `MKMapView`.

Accelerate also introduced Neural Network APIs. If I had to guess, this is what’s used behind the scenes for facial and object recognition in photos. The only downside of using these APIs for now, is that you’ll have to give it pre trained data.

If you have any feedback or corrections to share with me, please reach out to me on twitter [@marksands](https://twitter.com/marksands). And if you haven’t already started watching the recorded sessions from last week, I encourage you to watch them!