---
layout: post
permalink: /2015/2/10/a-debugging-story.html
title: A Debugging Story
category : Programming
tags: [programming, Objective-C]
comments: true
showads: true
---

### Forward

The following is a synopsis of a crash that stumped my team for several days, and the process we took to investigate such bizarre behavior and ultimately diagnose and fix the problem. I'll go over how we arrived at our solution and the debugging steps we took to get there. Hopefully by the end of the story you'll have learned something along the way.

### Unrecognized Selector Sent To Instance

It began with initializing Parse. A simple call to `[Parse setApplicationid:@"jumbledString" clientId:@"anotherString"];` in the first line of `applicationDidFinishLaunching:withOptions:`. This is very standard procedure, and the Parse documentation even says to do this. Unfortunately, the app would consistently crash on this line with `[__NSCFBoolean stringByReplacingOccurrencesOfString:withString:]: unrecognized selector sent to instance`.

To make a long story short, I'll leave out the obvious debugging tidbits and drive closer to the point.

Using a different, older version of Parse.framework didn't help either, so it was time to look at the stack trace more carefully to see where exactly the crash was happening. Here's the relevant parts of the stack trace:

```
 #0: `-[NSFileManager _URLForReplacingItemAtURL:error:]
 #1: `_NSCreateTemporaryFile_Protected + 404
 #2: `_NSWriteDataToFileWithExtendedAttributes + 276
 #3: `_NSWriteBytesToFileWithExtendedAttributes + 76
 #4: `writeStringToURLOrPath + 240
 #5: `-[NSString writeToFile:atomically:encoding:error:] +
 #6: `+[PFInternalUtils checkCacheApplicationId] + 700 at PFInternalUtils.m:239
 #7: `+[Parse setApplicationId:clientKey:] + 134 at Parse.m:54
```

### Register Read

I put a symbolic breakpoint on `-[NSString writeToFile:atomically:encoding:error:]` to see if anything looked suspicious. When the breakpoint hit, I opened lldb and did a `register read` to dump the assembly registers to see if anything stood out. Take a look:

```
(lldb) register read
General Purpose Registers:
        r0 = 0x0015f7b8  @"jumbledString"
        r1 = 0x29115a7b  "writeToFile:atomically:encoding:error:"
        r2 = 0x14641a30
        r3 = 0x00000001
        r4 = 0x14641a30
        r5 = 0x0015f7b8  @"anotherString"
        r6 = 0x00000000
        r7 = 0x0031d5ec
        r8 = 0x0014e996  "dataFilePath:"
        r9 = 0x00000000
       r10 = 0x14641000
       r11 = 0x290ea935  "fileExistsAtPath:"
       r12 = 0x2618d131  Foundation`-[NSString writeToFile:atomically:encoding:error:] + 1
        sp = 0x0031d5b8
        lr = 0x0012679d  Aerie`+[PFInternalUtils checkCacheApplicationId] + 701 at PFInternalUtils.m:239
        pc = 0x2618d130  Foundation`-[NSString writeToFile:atomically:encoding:error:]
      cpsr = 0x60000030
```

Clearly it was writing something to file at a particular path, and that's where things went awry. I figured if I could get the exact path it was writing to, and the contents, maybe I could bypass this check and Parse would magically work. Fortunately, register 10 had what we needed:

```
(lldb) po 0x14641000
/var/mobile/Containers/Data/Application/17F2392D-56EF-4259-84AD-1CD9EEA58E89/Library/Private Documents/Parse/applicationId
```

I assumed applicationId was a file that held the applicationId string, for whatever reason. The existence of `fileExistsAtPath:` in the registers led me to believe that if I created this file at this exact path, all would be well. So I got rid of the call to Parse, and temporarily replaced it with a series of commands to write the applicationId to a file at that location.

Shockingly, I got the same crash `[__NSCFBoolean stringByReplacingOccurrencesOfString:withString:]: unrecognized selector sent to instance`. Now this led me down an entirely different rabbit whole that I'll spare you from (it involved POSIX file permissions, and chmodding a bunch of directories).

### _URLForReplacingItemAtURL:error:

I decided to open Hopper.app and look at the internals of `-[NSFileManager _URLForReplacingItemAtURL:error:]`. Sure enough, I spotted a call to `stringByReplacingOccurrancesOfString:withString:` halfway down the disassembled code:

```objc
    rax = CFBundleGetValueForInfoDictionaryKey(CFBundleGetMainBundle(), @"CFBundleName");
    var_16 = [rax stringByReplacingOccurrencesOfString:@"/" withString:@":"];
```

This was the eureka moment I'd been waiting for. The rax register should be an `NSString`, but it's somehow getting converted to a boolean object. To make sure I wasn't crazy, I copied `CFBundleGetValueForInfoDictionaryKey(CFBundleGetMainBundle(), @"CFBundleName");` into my AppDelegate to see what value was returned from the function. Calling print object on the `CFTypeRef` gave me a plain old 0. I was curious what I would see when I looked at what was set on the BundleName of the Info.plist.

### Corrupt Info.plist

Not surprisingly, the type column of the bundle name said Boolean and the value was NO. A quick revert to the plist and everything worked out great. I was pretty sure this was a mistake, so I checked the commit history to see if this whether always the case: `git log -p --follow Project/Info.plist`

```diff
@@ -11,7 +11,7 @@
        <key>CFBundleInfoDictionaryVersion</key>
        <string>6.0</string>
        <key>CFBundleName</key>
-       <string>$(PRODUCT_NAME)</string>
+       <false/>
        <key>CFBundlePackageType</key>
        <string>APPL</string>
        <key>CFBundleShortVersionString</key>
```

Lo and behold, it was indeed an accident. But sometimes, accidents present the most interesting problems. Who knew that having a faulty bundle name would prevent you from writing files to disk?

To recap: we started with a crash, a stack trace, inspecting registers, a poor attempt at monkey patching, disassembling Foundation using Hopper.app, and finally circling back to the corrupt Info.plist file. Careful eyes probably could have spotted this mistake by searching through the commit history, but that's not always the case. At any rate, I had a lot of fun doing some code spelunking!