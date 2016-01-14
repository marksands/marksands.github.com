---
layout: post
permalink: /2016/1/14/paper-doll-app-development.html
title: Paper Doll App Development
category : Programming
tags: [programming, iOS]
comments: true
showads: true
---

_This post is in response to the iOhYes podcast [#98 We Heard You Like Rants](http://5by5.tv/iohyes/98)_

### Apple's Best Practices

When Apple publishes sample code, they have to cater to their audience. They can't expect to publish sample code that only 1% of readers can immediately take it and roll with it. Intead they employ a common publishing tactic known as lowering literacy to minister to a broader audience. In this manner, Apple's sample code won't be glistening with SOLID design or highly composable elements but instead will be a popular, actionable source for most developers.

With this in mind, it's fair to say that there is no formal standard for creating iOS apps. While there may be numerous sources for how to best architect an application, you are allowed to create your own set of _best practices_ and decide as a team how you choose to write your code. Some developers will choose to use storyboards and nibs while others will leverage many existing design patterns and alternatives to model-view-controller. Still, there will be those that use a form of dependency injection to suit both storyboard and nib development and programmatic view creation.

I won't get into the meat and potatoes of dependency injection, but just remember that it's a "25-dollar term for a 5-cent concept". Simple dependency injection for iOS can be done in at least 2 ways: constructor injection and setter injection. If a class cannot function without a dependency, then it is semantically correct to inject the dependency into the constructor. Naming your initializer "initWithResponsibility" gives credence that the Responsibility object that is passed in is necessary from birth and the class won't function without it. If instead you choose to set the Responsibility object after construction, then you have broken semantics and have fallen into two-step construction.

The late Jim Weirich often spoke of a software quality metric known as connascence, which you should absolutely take with a grain of salt. Nevertheless, I do use it at times for a second opinion. When you have two-step construction, you end up with connascence of execution, meaning the order of execution of your components is important. The two-step construction must always be shoved together in code in fear of a third party caller using your class, only to have it break down since your Responsibility object isn't set on the class yet. This doesn't mean you shouldn't have two-step construction--after all, there is no other way if you're using storyboards. It just means your architecture now has more entropy in its design.

The downside of constructor injection, of course, is when it doesn't work in iOS development. If you use storyboards and rely heavily on segues for navigation, then you are forced into two-step construction. Some developers have chosen to abandon storyboards and nibs altogether and some have embraced them so wholeheartedly that the Crusades may very well be indistinguishable from this Holy War. At the end of the day, it's probably best to adhere to a convention that your whole team agrees upon and hold each other accountable for the chosen discipline.

### Egregious Unit Tests

It's unfortunate that the myth of 100% code coverage is discussed in the software development community. Some project managers think that if you don't have 100% code coverage, then your application isn't properly tested. While in reality, 100% code coverage only means that every line of code was executed, it does not mean that every conditional statement was met. Furthermore, it's arguably worse when a developer doesn't think their application isn't properly tested unless it has 100% code coverage.

It's a shame when TDD and unit testing is misrepresented due to a poor test suite and a lack of talent behind its implementation. But this isn't an unfamiliar concept outside of software development. You'll be hard pressed to find a community that doesn't have misrepresentation scattered in its midst: the Westboro Baptist Church and Donald Trump do not represent the message of Christianity and ISIL and Boko Haram don't represent the message of Islam. I mention this because the dogma of TDD and writing unit tests often feels like a pseudo religious debate that often takes a TDD apologist or a Great Awakening to convince developers of its worth. And once you're a TDD convert, it doesn't stop there. It requires a lot of discipline to maintain that mindset and to hold yourself and your peers accountable of writing a clean test suite and continuously improving your skills in that area.

If you encounter a test suite that is overly complex or is going through great lengths to establish a near 100% code coverage, don't let that deter you from maintaining that suite. Conjure up the courage to delete tests that aren't providing you value or worth and refactor the ones that are giving you value to improve reuse and readability. And remember that tests help show you pain, so if writing a test is painful then do something about it.

### Paper Doll App Development

One thing I was happy to hear the hosts of iOhYes speak to was the movement of the glue coder. I don't know what's at fault for this phenomenon, but I do believe there is large portion of iOS developers that practice Paper Doll App Development. Essentially what's happening is developers are picking and choosing piecemeal open source components to glue together in order to build a fully integrated application, much like adding clothes to a paper doll. It wouldn't shock me to find successful apps in the App Store that have been built by individuals who don't know how to code but instead are skilled at discovering the free libraries available and piecing them together in order to build an app. And unfortunately, building apps this way for too long can be harmful to your career when it comes necessary to find a job or change jobs. Don't expect to do well in a technical interview.

It's true that Cocoapods and GitHub have together created an extremely large catalog of open source libraries and project templates to get you up and running, but I do agree with the hosts of iOhYes that they are not to be held accountable. Perhaps it's a lack of discipline in the iOS community and the rise of rapid prototyping is taking over. Given iOS is still in its infancy, it's hard to tell whether or not the mode of development at this pace will continue in the future. As present day iOS developers, we have the good fortune of having a pretty high bar for legacy code, but in a decade or so, maintaining an app that was built with such incompetence will be a very different story. Do your future self a favor and don't practice paper doll app development.
