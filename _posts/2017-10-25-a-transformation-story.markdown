---
layout: post
permalink: /2017/10/25/a-transformation-story.html
title: A Transformation Story
category : Programming
tags: [programming, swift, iOS, Design Patterns]
comments: true
showads: true
---

I work a lot with legacy code and frequently encounter strange and bizarre solutions to otherwise simple problems. Most of the legacy projects I work with share common architectural problems and a set of regular occurring bugs. While I don't have an answer as to why these common patterns emerge from legacy projects, I will do my best to pull apart some of these issues and write about my findings.

Today I encountered a function that looks more or less like this:

```swift
struct Name {
    let firstName: String?
    let middleInitial: String?
    let lastName: String?
}

func fullName(name: Name) -> String {
    var fullName = ""
    if let firstName = name.firstName {
        fullName += firstName.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    if let middleInitial = name.middleInitial {
        fullName += " " + middleInitial.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    if let lastName = name.lastName {
        fullName += " " + lastName.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    return fullName
}
```

Notice any bugs? What does `fullName` return when the `firstName` or the `middleInitial` is `nil`?

<!-- more -->

If it's not obvious to the developer that they can append a final `.trimmingCharacters(in: .whitespacesAndNewlines)` to the output in order to fix the whitespace bug, they might choose to fix the bug by disecting each individual conditional branch and increase the entropy of the code base.

Functions like this one provide trivial insertion points to make changes to the output of the result. But for this non-localized name formatter, we shouldn't need anything more than a simple transformation. While there's nothing technically incorrect about the patched function, I'm still not a big fan. Any developer can introduce unintended side effects within this function, and that bothers me.

If we take a step back, it should be obvious that all we need to do is _join_ the name components with a space character. When stated aloud, it definitely sounds like an entire function to facilitate the join is overkill. There are two factors that are in our way of using a simple reduce operation: the name components are optional and we need to trim whitespace. Fortunately, the Swift standard library includes a [variation of `flatMap`](https://developer.apple.com/documentation/swift/array/2903427-flatmap) that can transform optionals over an array, so this shouldn't be a problem. Let's give it a shot:

```swift
let fullName = [name.firstName, name.initial, name.lastName]
    .flatMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
    .joined(separator: " ")
```

This makes me feel much better about the solution. We don't need a separate function any longer because we're doing a simple transformation over the three name properties. What's great is it's much more difficult to be _clever_ about it and introduce unintended side effects.

Our functional transformation even scales better. If we need to add titles or multiple middle names, the new feature simply become extra components of the array--that's cheap if you ask me.