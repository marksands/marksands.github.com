---
layout: post
permalink: /2015/1/7/reacting-to-reactive-cocoa-part-iii.html
title: Reacting to Reactive Cocoa Part III
category : Programming
tags: [programming, Objective-C, reactive cocoa]
comments: true
showads: true
---

### Asynchronously Loading Images

One of my first endevours into the realm of expanding my `RACObserve`-fu was to asynchronously load a `UIImage` from an image URL that was returned from the movie API in order to populate thumbnails in table view cells. Historically, using `AFNetworking`'s built-in mechanism or a third party caching library such as `SDWebImage` would work perfectly fine, but I wanted to stick to my guns and fully gulp the Reactive Cocoa punch that I've so graciously poured.

<!-- more -->

This one was hard. I gave it several attempts before finally coming to a working solution, but I never did find the answer I wanted.

### Attempt 1

I never got my first attempt at this to work, but I'll show the broken code nonetheless. I began my endevour by shamelessly stealing a code snippet from a project on GitHub called [Functional Reactive Pixels](https://github.com/ashfurrow/FunctionalReactivePixels/blob/aef9b670ec5f14d496049c9e214f99513ca579df/FRP/FRPPhotoImporter.m#L46-L58). The code snippet is slightly different from what I ended up with, but the overal theme is the same: I create an `NSURLRequest`, use the `rac_sendAsynchronousRequest` category method, call `reduceEach` to deflate the `RACTuple` into the appropriate parameters, return the `NSData` from the response, deliver the signal on the main thread, map the `NSData` again to return the `UIImage` form of the bytes, and eventually finish with a call to `publish` and `autoconnect` (whew!).

```objc
    RAC(self.posterImageView, image) = [RACObserve(self, movie.posterURL) map:^id(id value) {
        NSURLRequest *request = [NSURLRequest requestWithURL:value];
        return [[[[[[NSURLConnection rac_sendAsynchronousRequest:request] reduceEach:^id(NSURLResponse *response, NSData *data){
            return data;
        }] deliverOn:[RACScheduler mainThreadScheduler]]
                map:^id(NSData *data) {
                    return [UIImage imageWithData:data];
                }] publish] autoconnect];
    }];
```

All of this made intuitive sense to me, except the final two methods `publish` and `autoconnect`. An inspection of `publish` shows that it wraps a signal into a `RACMulticastConnection` object, while the `autoconnect` returns the multicast connection object as a signal. The recurring mystery object that kept creeping up was this `RACDisposable` object that I hadn't bothered, at least at this point, to investigate.

Ultimately, this code never worked. Each time it ran, it would crash and throw this exception burried in the giant stack trace (have I mentioned how large the stack traces become when using Reactive Cocoa?):

```
2015-01-07 20:23:12.809 BestMovieDeal[5998:117268] *** Terminating app due to uncaught exception 'NSInvalidArgumentException', reason: '-[RACDynamicSignal size]: unrecognized selector sent to instance 0x7f8ad1c6a180'
```

### Attempt 2

My second try was to slim down my first approach, using only what I thought was absolutely necessary to make it work. I removed the final 3 lines of the block and returned the `UIImage` instead of the `NSData` object to be mapped over again and then returned as an image. This looked promising, but unfortunately gave me the identical stack trace as the first attempt.

```objc
    RAC(self.posterImageView, image) = [RACObserve(self, movie.posterURL) map:^id(id value) {
        NSURLRequest *request = [NSURLRequest requestWithURL:value];
        return [[[NSURLConnection rac_sendAsynchronousRequest:request]
                    reduceEach:^id(NSURLResponse *response, NSData *data){
                        return [UIImage imageWithData:data];
                    }] deliverOn:[RACScheduler mainThreadScheduler]];
    }];
```

Something still isn't right, but it's very hard to deduce what is wrong. I did see `-[UIImageView setImage:] + 316` in the stack trace, so I feel like I am on the right track; it just looks like either it's not an image being set on it or something else is awry. And unfortunately, setting a breakpoint on the line with the statement `[UIImage imageWithData:data]` never gets called. I gave an amateur shot at some lldb spelunking, but it went much slower than what I was used to and I never got anywhere. The next step is to take some time to learn about the missing pieces and find a working solution.

### Attempt 27

This time I decided to take a step back. I didn't _need_ the images to be asynchronously loaded in order to display them. The simplest way that I was sure would work, was to use good ol' `+[NSData dataWithContentsOfURL:]`. 

```objc
RAC(self.posterImageView, image) = [RACObserve(self, movie.posterURL) map:^id(id value) {
    return [UIImage imageWithData:[NSData dataWithContentsOfURL:value]];
}];
```

Success! It was, of course, slow, but it worked.

### Attempt 342

Since I had a synchronous solution, my next attempt was to see if I could turn it into an asynchronous solution. From what I've gathered, `deliverOn:[RACScheduler scheduler]` will create a signal that delivers subsequent events on a background thread, and `deliverOn:[RACScheduler mainThreadScheduler]` will deliver events on the main thread. In the spirit of Reactive Cocoa, I combined the two and came up with this:

```objc
RAC(self.posterImageView, image) = [[[[RACObserve(self, movie.posterURL) deliverOn:[RACScheduler scheduler]] map:^id(id value) {
    return [NSData dataWithContentsOfURL:value];
}] deliverOn:[RACScheduler mainThreadScheduler]] map:^id(NSData *data){
    return [UIImage imageWithData:data];
}];
```

I finally landed a way to asynchronously load images to populate tableview cells, but I'm not settling on this solution because `+[UIImage imageWithData]` can be slow.

### Attempt N

In my efforts to find the Holy Grail of how to go about asycnrhonously loading images using Reactive Cocoa, I stumbled across a very interesting [GitHub issue](https://github.com/ReactiveCocoa/ReactiveViewModel/issues/16).² The gentleman in this thread appears to have a working solution using `+[NSURLConnection rac_sendAsynchronousRequest:]`, but is struggling with a higher level problem. Ash Furrow chimed in on the thread referencing an [issue](https://github.com/ashfurrow/FunctionalReactivePixels/issues/27) from his project to see a different solution.³ The code in their dicsussion started out like this:

```objc
RAC(self.imageView, image) = [[[RACObserve(self, photoModel.thumbnailData) ignore:nil] map:^id(id value) {
    return [RACSignal createSignal:^RACDisposable *(id<RACSubscriber> subscriber) {
        [[RACScheduler schedulerWithPriority:RACSchedulerPriorityHigh] schedule:^{
            [value af_decompressedImageFromJPEGDataWithCallback:^(UIImage *decompressedImage) {
                 [subscriber sendNext:decompressedImage];
                 [subscriber sendCompleted];
             }];
        }];
        return nil;
    }];
}] switchToLatest];
```

What's interesting is that they are creating and returning a signal within their `map:` block, as opposed to decompressing on the main thread and returning a value object. It makes me wonder why the examples I've seen didn't have to do that, and simply chaining it with `reduceEach:` was good enough.

When discussing cancelling the background operation, [Dave Lee](https://github.com/kastiglione) chimed in, "You could use `-subscribeOn:` which also takes care of handling cancelation. Even if you don't, since `-schedule:` returns a disposable, which can be returned as the result of `+createSignal:`."

```objc
    RAC(self.imageView, image) = [[[RACObserve(self, photoModel.thumbnailData) ignore:nil] map:^id(id value) {
        return [[RACSignal createSignal:^RACDisposable *(id<RACSubscriber> subscriber) {
            [value af_decompressedImageFromJPEGDataWithCallback:^(UIImage *decompressedImage) {
                 [subscriber sendNext:decompressedImage];
                 [subscriber sendCompleted];
             }];
            return nil;
        }] subscribeOn:[RACScheduler scheduler]];
    }] switchToLatest];
```

`switchToLatest` is new to me, and a quick look at the docs says that it "Returns a signal which passes through `next`s and `error`s from the latest signal sent by the receiver, and sends `completed` when both the receiver and the last sent signal complete." My best guess is since the subscriber of the image is now subscribing to a signal-returning-a-signal, the `switchToLatest` will ensure that the original subscriber will be sent the `next` event which will contain a value object: the decompressed `UIImage`.

### Conclusion

I never did return to this problem, and left the slower implementation in the code. There are bigger things ahead, and I don't want this one to slow me down any more. If anyone reading this can steer me in the right direction, I'd appreciate it!

### References

* [[1] Functional Reactive Pixels - FRPPhotoImporter.m:L46-58](https://github.com/ashfurrow/FunctionalReactivePixels/blob/aef9b670ec5f14d496049c9e214f99513ca579df/FRP/FRPPhotoImporter.m#L46-L58)
* [[2] Binding asynchronously loaded images from a view-model](https://github.com/ReactiveCocoa/ReactiveViewModel/issues/16)
* [[3] Bad scrolling performance](https://github.com/ashfurrow/FunctionalReactivePixels/issues/27)
