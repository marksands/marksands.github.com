---
layout: post
permalink: /2014/05/27/how-apple-cheats.html
title: How Apple Cheats
category : Programming
tags: [programming, objective-c, iOS]
comments: true
showads: true
---

As every iOS developer knows, Apple can do whatever they want with their own native apps, meaning they can and do use private APIs. It's not too surprising, after all, it is their domain and they are in control. However, Apple's overuse of private APIs can make third-party apps second-class citizens; iBooks is notorious of such private API abuse[¹](http://www.marco.org/2010/04/06/ibooks-and-private-apis).

<!-- more -->

### UIPopoverController on the iPhone

One UIKit component iBooks uses is UIPopoverController. This is frustrating because UIPopoverController is reservered for iPad development only. So how does iBooks implement an iPod/iPhone compatible UIPopoverController? I [inspected](http://marksands.github.io/2014/01/03/inspecting-third-party-apps.html) iBooks on a jailbroken iPod touch to verify that the popover was in fact the UIPopoverController class and not a cheap replacement. To be sure I wasn't crazy, I created a new iOS project targeted for iPhone and spun up a quick `UIPopoverController` Hello World app. Sure enough, it crashed `-[UIPopoverController initWithContentViewController:] called when not running under UIUserInterfaceIdiomPad.` If this is true, then how on earth is Apple getting around this?

### The Secret Sauce

In order to find out Apple's secret sauce, I opened [Hopper](http://www.hopperapp.com/) to dig a little deeper. Here's sort of what Apple's code <s>may look like</s> looks like under the covers when creating a UIPopoverController.

```objc
- (id)initWithContentViewController:(UIViewController *)viewController {
	if (([[UIDevice currentDevice] respondsToSelector:@selector(userInterfaceIdiom)]) {
		if ([[UIDevice currentDevice] userInterfaceIdiom] != UIUserInterfaceIdiomPad) {
			if ([UIPopoverController _popoversDisabled]) {
    			[NSException raise:NSInvalidArgumentException format:@"-[UIPopoverController initWithContentViewController:] called when not running under UIUserInterfaceIdiomPad."];
			}
		}
	}	
	...
}
```

As you can see, they are definitely checking to make sure the current device is an iPad, otherwise it will raise an exception. But wait, what's this private class method `_popoversDisabled`? Let's open that up to find out.

```objc
+ (BOOL)_popoversDisabled {
    NSString *bundleIdentifier = [[NSBundle mainBundle] bundleIdentifier];
    if ([bundleIdentifier isEqualToString:@"com.apple.iBooks"] || [bundleIdentifier isEqualToString:@"com.apple.mobilesafari"] || 
		[bundleIdentifier isEqualToString:@"com.apple.itunesu"] || [bundleIdentifier isEqualToString:@"com.apple.Maps"]) {
		return NO;
	}
	return YES;
}
```

Say what?! Did Apple seriously grant access to four of their native apps by hardcoding their bundle identifiers? Yep, they sure did².

In fact, you don't have to do anything special to verify this. If you change your `UIPopoverController` Hello World project's Info.plist bundle identifier to `com.apple.iBooks` or `com.apple.itunesu`, then voilà, It works!

### What now?

It's interesting to see how Apple bends the rules for their benefit, but I think there is something more telling here. The fact of the matter is, `UIPopoverController` works on the iPhone and iPod touch out of the box. Apple simply has it locked down for now. Will iOS 8 finally bring `UIPopoverController` support to the iPhone and iPod touch? One can hope! At least we only have to wait until next week to find out.

### References

* [[1] iBooks and Private APIs](http://www.marco.org/2010/04/06/ibooks-and-private-apis)
* [2] +[UIPoverController _popoversDisabled] My rudimentary debugging skills must note that it's possible I overlooked something and more apps have their hands untied than just these four