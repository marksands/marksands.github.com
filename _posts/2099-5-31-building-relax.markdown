---
layout: post
permalink: /2017/6/1/building-relax-part-1.html
title: Building Re:Lax
category : Programming
tags: [tvOS]
comments: true
showads: true
---

## Building Re:Lax - Part 1

The following is a part 1 of a technical deep dive series into how [Re:Lax](github.com/asynchrony/Re-Lax) was created, specifically focusing on reverse engineering the LCR file format.

On iOS, a user can simply tap an element on the screen, but with tvOS the user is not in a position to physically interact with the screen. Instead, the Siri remote's touchpad acts as a virtual cursor in order to interact with the tv at a distance. The Apple Siri Remote can be compared with the Atari 2600 controller: a user can move around the touch surface with their thumb, much like using a joystick, and can press to click the touch surface, just like tapping the red button on the controller. This is all made possible with the focus engine.

The focus engine provides some affordances when interacting with focusable elements. Focused elements have a wobble effect applied to it that animates as the user moves around the touchpad. Out of the box, `UIImageView`s can have a parallax effect applied to it, which adds depth to the element, and the layers shift as the user moves around the touchpad when the element is focused. Unfortunately, only `UIImageView`s support parallax out of the box.

<!-- more -->

We wanted a way to provide the parallax affordance to focused elements throughout our tvOS app. We felt that the parallax effect provided the best experience for focused elements, but it was impossible to add parallax effects to dynamic content. And since there was no programmatic API in place to add the parallax effects, we had to scratch our own itch.

At first, we dived into the UIMotionEffects API to programmatically add the wobble effect to the element. Complexity grew as we added the stacked layers, the sheen, the drop shadow, and all the other detail and polish to match pixel-perfect to the real thing. Once we were able to creat the parallax effect, we realized that top shelf extensions didn't have the luxury of our custom API, since it can only load LCR image files from a provided URL. Fortunately, a URL can be a remote URL or a local file URL and it works just the same. We figured that if we could generate LCR files, we could write them to the cache directory (the only writable directory on tvOS as of tvOS 10), and serve them via local URL in the top shelf extension. That left us with only one option--we had to reverse engineer the LCR binary format as well.

The combination of our custom programmatic parallax API as well as the reverse engineered LCR file format gave birth to Re:Lax. Recreating the parallax effect programmatically was definitely a sweet sensation, but matching the LCR file byte-for-byte was a whole new feeling. I [spoke a little about this on iOhYes](http://5by5.tv/iohyes/119) last November, but now I can go into depth about the technical minutia. 

## What are LCR files?

An LCR file is a proprietary image format that Apple uses to load parallax images for tvOS. Currently, LCR files can only be generated either through a Photoshop plugin, the Parallax Preview app, or a command line utility called layerutil. It's a cumbersome process to generate LCR files, but it's necessary if you want to load an arbitrary file that is not stored in the app bundle or to load on-demand resources.

The Parallax Preview app is the most straightforward method of generating parallax image files. One simply drops individual layers as .png or .jpeg files onto the tool, and a visual demonstration of the parallax file is shown in the window. Of course, this method of parallax file creation is way too tedious and time consuming at a large scale.

![Parallax Preview](/img/parallaxpreview.png)

Apple has limited documention about generating LCR files remotely, but they do mention it at [https://developer.apple.com/.../CreatingParallaxArtwork.html](https://developer.apple.com/library/content/documentation/General/Conceptual/AppleTV_PG/CreatingParallaxArtwork.html#//apple_ref/doc/uid/TP40015241-CH19-SW1). Running the command `layerutil -c <filename.lsr> -o filename.lcr` will convert either a PSD or an LSR into the LCR file. With the LCR file, one can now bundle it within the app or host it remotely to be served to the app on-demand.

The final step when using the lcr file is to incorporate it in the app. If the file is bundled, you can load it via `UIImage(named:)` and if it's served remotely you can use `UIImage(contentsOfFile:)`. Then your `UIImageView` is ready to have the best native experience that tvOS has to offer.

## LSR → LCR → CAR

Let's take a look at what lsr files are really made of. I was somewhat surprised to find Apple giving away the secret sauce in the documentation at [https://developer.apple.com/.../CreatingParallaxArtwork.html](https://developer.apple.com/library/content/documentation/General/Conceptual/AppleTV_PG/CreatingParallaxArtwork.html#//apple_ref/doc/uid/TP40015241-CH19-SW1).

> When the project is compiled, the image stacks and .lsr images in your asset catalogs are transformed into the .car file format and bundled with your app.

To translate, Apple is admitting that compiled parallax files, lcr files, use the .car file format. This is a super interesting find. If you've ever inspected an IPA file's contents, simply by unzipping the IPA that is masquerading as a zip file, then you've probably seen an `Assets.car` file sitting in there. It turns out that Xcode's Asset Catalog get compiled to the .car file format as well. So not only do Asset Catalogs compile to .car formats, but lcr files are also .car formats.

This eureka moment was crucial for the reverse engineering process. Having previously been involved with reverse engineering IPA files, I was familiar with various tools that let you inspect the internal images of a .car file. By far, the most valuable resource we found was a project called [ThemeEngine](https://github.com/alexzielenski/ThemeEngine). The developer, Alexander Zielenski, took the liberty of [documenting and annotating]( https://github.com/alexzielenski/ThemeEngine/blob/v2/ThemeKit/ThemeKit/Headers/TKStructs.h) a lot of the private methods and magic numbers that are involved in deciphering the internals of a .car file. Thanks, Alex, for your help!

![Theme Engine](/img/themeengine.png)

## Layerutil

Armed with our newfound knowledge of CAR files, we shifted gears by learning all we could about Apple's command line tool layerutil, which generates LCR files by converting either a PSD or an LSR file. LSR files are used to load image stacks, which can be layers for a parallax image, into an Asset Catalog. Apple has good [documentation about the format](https://developer.apple.com/library/content/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/LSRFormatOverview.html#//apple_ref/doc/uid/TP40015170-CH44-SW1) for Asset Catalogs, if you're curious. To walk through the innards of the LSR format, you can rename its file extension from `.lsr` to `.zip` and inspect the contents of it. LSR files, which have a very similar internal structure to Asset Catalogs, can be converted to LCR files, likewise, Asset Catalogs are converted to CAR files, so there is a lot of symmetry there.

In order to see what layerutil was doing under the hood to generate LCR files, we dropped the utility into [Hopper](https://www.hopperapp.com/) and took a look at what frameworks were being used. Inside of layertuil, numerous calls to `CUI` namespaced methods were called all over the place, which meant that we finally had a seam to begin unraveling.

## CoreUI

CoreUI is the framework that drives the creation of Asset Catalogs and LCR files. The only catch is that it's a private framework, so we went into this knowing nothing and with very little help available to boot. I wanted to get a grasp on the meatier methods that CoreUI was using to render the parallax images in order to split our efforts up and focus on converting Hopper dumps into compiling Swift code. I had a lot of prior experience with method swizzling for similar debugging purposes, so I was drawn to that technique at first. It's important to realize there is no formula to this process, but instead is mostly balanced with intuition and guess and check.

Browsing the CoreUI runtime headers on [GitHub](https://github.com/nst/iOS-Runtime-Headers/blob/6a384f6a219be448de8714f263a4c212516d52b6/PrivateFrameworks/CoreUI.framework/CSIGenerator.h#L152), I found a method that looked like an interesting place to start. Unfortunately, I no longer have the original library source file but it looked something like this:

{% highlight ObjC %}
#import <Foundation/Foundation.h>
#import <objc/message.h>
#import <objc/runtime.h>

@interface TFFHook : NSObject
@end
 
@implementation TFFHook

static void __attribute__((constructor)) TFFHookInstall() {
    Class addOnManagerClass = NSClassFromString(@"TFFHook");
    Method originalMethod = class_getInstanceMethod(objc_getClass("CSIGenerator"), NSSelectorFromString(@"writeHeader:toData:"));
    Method swizzledMethod = class_getInstanceMethod(addOnManagerClass, @selector(tff_writeHeader:toData:));   
    method_exchangeImplementations(originalMethod, swizzledMethod);
}

- (void)writeHeader:(struct _csiheader { unsigned int x1; unsigned int x2; unsigned int x3; unsigned int x4; unsigned int x5; unsigned int x6; unsigned int x7; unsigned int x8 : 4; unsigned int x9 : 28; struct _csimetadata { unsigned int x_10_1_1; unsigned short x_10_1_2; unsigned short x_10_1_3; BOOL x_10_1_4[128]; } x10; unsigned int x11; struct _csibitmaplist { unsigned int x_12_1_1; unsigned int x_12_1_2[0]; } x12; }*)arg1 toData:(id)arg2;
    // a lot of printf statements
}

@end
{% endhighlight %}

I compiled the source code into a dynamic library:

```
xcrun -sdk macosx clang -dynamiclib CUIHook.m -framework Foundation libCUIHook.dylib
```

And, using `dyld`, ran it against `layerutil` from the terminal:
 
```
DYLD_INSERT_LIBRARIES=libCoreUIHook.dylib layerutil test.lsr
```

I ran this numerous times and printed out as much diagnostics as I could against this method and many many others. This turned out to be super helpful. In the example snippet, our diagnostics told us what the `csiheader` was for each parallax layer so we were able to match up the meta data based on the documentation from ThemeEngine. Here's a look at the `csiheader` struct:

{% highlight C %}
struct csiheader {
    unsigned int magic; // "CTSI" – Core Theme Structured Image
    unsigned int version; // current version is 1
    unsigned int renditionFlags: // 0 in our case
    unsigned int width;
    unsigned int height;
    unsigned int scaleFactor; // display scale * 100. 100 is 1x, 200 is 2x, etc.
    unsigned int pixelFormat; // 1145132097 (DATA), 1246774599 (JPEG), or 1095911234 (ARGB)
    unsigned int colorspaceID; // 0 for sRGB, 1 for ARGB, 15 for JPEG
    struct _csimetadata {
        unsigned int modDate;  // 0 in our case
        unsigned short layout; // See below
        unsigned short reserved; // always zero
        char name[128]; // each layer, or image, name
    } metadata; 
    unsigned int infolistLength; // size of the list of information after header but before bitmap
    struct _csibitmaplist {
        unsigned int bitmapCount;
        unsigned int reserved;
        unsigned int payloadSize; // size of all the proceeding information listLength + data
    } bitmaps;
};
{% endhighlight %}

According to our experiments, in an LCR file, there is one CSI header for each layer as well as 3 extra headers. The entirety of the parallax image contains one as well as each parallax layer, a flattened version of the parallax image, and the white sheen that overlays the parallax image--known as the "radiosity" in CoreUI. It was helpful that the generator named the "flattened" and "radiosity" layers for us.











* What is LCR and where is it used for tvOS?
* LSR -> LCR is a lot like xcassets -> CAR
* layerutil
* CoreUI
* BOM
* Transparent Image Compression using Accelerate
* Putting it all together

{% highlight C %}
int magic = 1246774599;
char *value = (char *)&magic; // GEPJ

int magic = 1380013892;
char *value = (char *)&magic; // DWAR
{% endhighlight %}

Piecing together the hex data was basically a scene out of Argo taping together pieces of shredded paper until we had a renderable image.


## Inspecting CoreUI

Using a combination of otool, nm, and Hopper.app, we discovered that the heavy machinery being used to craft LCR files was done by the private framework CoreUI. [Utilizing DYLD](http://marksands.github.io/2014/01/03/inspecting-third-party-apps.html) I crafted a dynamic library that swizzled a lot of methods in the CoreUI framework that looked suspiciously useful to render parallax images on tvOS. The framework was mostly a quicker way to print which arguments were being passed around and some information about the types. Running layerutil, we were also able to attach the process to lldb and step through most of the steps required to convert images to LCR files, although the swizzled framework was a quicker approach. The benefit of this was to determine the methods to inspect in a disassembler like Hopper. This gave us a leg up in how CoreUI stored the images in the binary, what type of compression was used, and some very interesting techniques on storing transparent images as a JPEG.

## The Hex Phase

The next phase, and truthfully the remainder of our detective work, was spent in a hex editor. Dumping an LCR file in _Synalize It!_ was found to be our best resource since it has really good diffing functionality built in. This was a very labor intense exercise where we discovered that CAR files leveraged a format called Bill of Materials that was mostly efficient metadata that made seeking image data very efficient. We also learned the tricks Apple used to compress their image data.

For transparent images, CoreUI leverages the Accelerate framework to extract the alpha channel from images, uses lzsfe compression on the data to store it, and then stores the image data as a JPEG. In Re:Lax we copied this exact method, but recently learned that tvOS 10 supports GPU compression. It would be super cool to leverage this behavior if we ever want to drop support for tvOS 9.






{% highlight C %}
struct bom_header {
    char magic[8];
    int version;
    int numberOfBlocks;
    int indexOffset;
    int indexLength;
    int varsOffset;
    int varsLength;
    char reserved[480]; // 512 - previous bytes
};

class BOMStorage {
    let magic /* 8 Byte */ = "BOMStore"
    let version: UInt32 = 1
    var numberOfBlocks: UInt32 = 0 // In this case, only 34 non-null block entries
    var indexOffset: UInt32 = 0 // In this case, the byte following the varsOffset + varsLength (1668928)
    var indexLength: UInt32 = 0 // The entire rest of the file, with a lot of zeros... (21864) // something in the file REALLY cares about the 0s...
    var varsOffset: UInt32 = 0 // the byte offset of where the BOMVars starts (count of vars followed by index+length+name) (1668876)
    var varsLength: UInt32 = 0 // the total byte length of BOMVars including numberOfVars followed by each BOMVar (61)
    // NOTE: A little confusing because varsOffset actually precedes the indexOffset, so the file is read VARS then INDEX
}
{% endhighlight %}

CAR
CTSI
CTSI metadata
CLEM - only for alpha images
RAWD

CSI Slice Info: The Enum

{% highlight C %}
0xE903 - 1001: Slice rects, First 4 bytes length, next num slices rects, next a list of the slice rects
0xEA03 - 1002: UNKNOWN
0xEB03 - 1003: Metrics – First 4 length (including num metrics), next 4 num metrics, next a list of metrics (struct of 3 CGSizes)
0xEC03 - 1004: Composition - First 4 length, second is the blendmode, third is a float for opacity
0xED03 - 1005: UTI Type, First 4 length, next 4 length of string, then the string
0xEE03 - 1006: Image Metadata: First 4 length, next 4 EXIF orientation, (UTI type...?)
0xEF03 - 1007: Bytes Per Row: first 4 length, next for BPR for bitmaps
0xF003 - 1008: UNKNOWN
0xF103 - 1009: UNKNOWN
0xF203 - 1010: Internal Reference – First 4 length, next 4 reference magic 'INKL', next is variable
0xF303 - 1011: Alpha Cropped Frame
{% endhighlight %}

1001 Slices:
{% highlight C %}
struct csi_slice_info {
    struct csi_info_header info_header;
    unsigned int numberOfSlices;
    struct CGRect slices[0];
};
{% endhighlight %}

1004 Composition:

{% highlight C %}
struct csi_composition {
    struct csi_info_header info_header;
    unsigned int blendMode;
    unsigned int opacity;
}
{% endhighlight %}