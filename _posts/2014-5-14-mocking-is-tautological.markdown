---
layout: post
permalink: /2014/05/14/mocking-is-tautological.html
title: Mocking is Tautological
category : Programming
tags: [programming]
comments: true
showads: true
---

### Black and White

When writing unit tests using mocks, it forces the developer into whitebox testing. As the tests are supposed to drive the design, one can argue that this allows them to define the dependencies of the business logic in which they are writing the tests. The quandary, though, is that these tests are no longer unit tests as there is a discrepancy between a single unit and a system of functions that interact with many units or dependencies. Furthermore, tests that rely heavily upon mocks wind up with a test suite that has mocks mocking mocks mocking mocks and so forth, which can lead to a broken test suite any time a programmer tries to refactor in, or out, another dependency.

On the other hand, blackbox testing provides a much better hands off approach to implementation details, namely dependencies. In DI heavy software architecture, blockbox testing tends to be difficult without having the ability to mock and stub internal details. If you only rely on the Given-When-Then formula, then tests should only be concerned with input and output. Stated another way, mocks, expects, and verifies should be replaced with independent objects and assertions. Gary Bernhardt articulates this better than I can in his talk Boundaries.¹

### Dependencies and Decisions

When many dependencies, or units, are involved in a path or decision then you should write an integration test instead of mocking out dependencies for an "isolated" unit test. The only time this becomes painful is when multiple decisions in a path directly rely on multiple dependencies; this tends to reek of a code smell. One solution is to split dependencies and decisions into separate layers. Gary's talk above calls this the functional core and the imperative shell. In the imperative shell, many dependencies work together to formulate a single path with zero conditionals and decisions, while the decisions are deferred to each individual unit formulating the functional core. This makes the majority of testing pains go away.

The functional core can be fully unit tested with every decision having a test. And instead of unit testing the imperative shell, a single integration test will suffice for each component. The rules I follow are: when you find yourself testing a component with many dependencies, don't use mocks; instead, write an integration test. Refactor until most, if not all, decisions are deferred to each dependency and drive out the implementation using TDD.

### A Rant

This approach confirms most of my suspicions about using mocks in testing. Mocking (done wrong, and it is often done wrong) is tautological. I've both written code and I've seen code that mocks a dependency, stubs a method to return a result, and verifies that the method was called and the result was the expected output. I've never appreciated this style and it usually feels as though I'm ticking a box off of the test code coverage list. I remain unconvinced that this provides any benefits in opposition to an integration test.

With a test suite that reflects the style of mocks mocking mocks mocking mocks, refactoring can be a major testing pain. If you modify, add, or remove a dependency, chances are a lot of the mocks and method stubs in your tests will no longer be valid. I wouldn't be surprised if such a simple change broke an entire test class littered with mocks.

### A Resolution

1 Corinthians 1:13 says, "When I was a child, I spoke as a child, I understood as a child, I thought as a child: but when I became a man, I put away childish things." Fortunately, I have put aside my days of mocking. I have felt the pains and drawn my losses, choosing to revisit testing and figure out how to fix the problem. I have been experimenting with a side project attempting to separate the functional core from the imperative shell. It is not easy to remove every conditional from the shell, but it has definitely been a relief for testing. And now that my unit tests only use real objects and assertions, I no longer have to choose between which testing and mocking framework to include in my project. I would encourage you to try this approach and see for yourself if it changes the way you test your code.

### References

* [[1] Boundaries](https://www.destroyallsoftware.com/talks/boundaries)