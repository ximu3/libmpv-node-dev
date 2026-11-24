#import <Foundation/Foundation.h>
#import <IOSurface/IOSurface.h>
#import <OpenGL/OpenGL.h>
#import <OpenGL/CGLRenderers.h>
#import <OpenGL/CGLIOSurface.h>
#import <OpenGL/gl3.h>
#import <dlfcn.h>
#include <stdbool.h>

bool libmpv_cgl_matches(uint32_t left,uint32_t right) {
    return (left & kCGLRendererIDMatchingMask) == (right & kCGLRendererIDMatchingMask);
}

CGLContextObj libmpv_cgl_open(const uint32_t *requested, uint32_t *actual) {
    CGLPixelFormatAttribute attributes[] = {
        kCGLPFAOpenGLProfile, (CGLPixelFormatAttribute)kCGLOGLPVersion_3_2_Core,
        kCGLPFAAccelerated, kCGLPFAAllowOfflineRenderers,
        0, 0, 0
    };
    if (requested) {
        attributes[4] = kCGLPFARendererID;
        attributes[5] = (CGLPixelFormatAttribute)*requested;
    }
    CGLPixelFormatObj format = NULL;
    GLint count = 0;
    if (CGLChoosePixelFormat(attributes, &format, &count) != kCGLNoError || !format) return NULL;
    CGLContextObj context = NULL;
    CGLError status = CGLCreateContext(format, NULL, &context);
    CGLReleasePixelFormat(format);
    if (status != kCGLNoError || !context) return NULL;

    GLint selected = 0;
    if (CGLSetCurrentContext(context) != kCGLNoError ||
        CGLGetParameter(context, kCGLCPCurrentRendererID, &selected) != kCGLNoError ||
        (requested && !libmpv_cgl_matches((uint32_t)selected, *requested))) {
        CGLSetCurrentContext(NULL);
        CGLReleaseContext(context);
        return NULL;
    }
    *actual = (uint32_t)selected;
    return context;
}

void libmpv_cgl_close(CGLContextObj context) {
    CGLSetCurrentContext(NULL);
    CGLReleaseContext(context);
}

void *libmpv_gl_function(const char *name) {
    return dlsym(RTLD_DEFAULT, name);
}

IOSurfaceRef libmpv_cgl_surface(CGLContextObj context, uint32_t width, uint32_t height) {
    @autoreleasepool {
        NSDictionary *properties = @{
            (__bridge NSString *)kIOSurfaceWidth: @(width),
            (__bridge NSString *)kIOSurfaceHeight: @(height),
            (__bridge NSString *)kIOSurfaceBytesPerElement: @4,
            (__bridge NSString *)kIOSurfacePixelFormat: @(0x42475241)
        };
        IOSurfaceRef surface = IOSurfaceCreate((__bridge CFDictionaryRef)properties);
        if (!surface) return NULL;
        const size_t stride = IOSurfaceGetBytesPerRow(surface);
        const size_t allocation = IOSurfaceGetAllocSize(surface);
        const size_t row = (size_t)width * 4;
        if (IOSurfaceGetWidth(surface) != width || IOSurfaceGetHeight(surface) != height ||
            IOSurfaceGetPixelFormat(surface) != 0x42475241 || IOSurfaceGetBytesPerElement(surface) != 4 ||
            IOSurfaceGetPlaneCount(surface) > 1 ||
            stride < row || allocation < row || (height - 1) > (allocation - row) / stride) {
            CFRelease(surface);
            return NULL;
        }
        CGLError result = CGLTexImageIOSurface2D(context, GL_TEXTURE_RECTANGLE, GL_RGBA8,
            width, height, GL_BGRA, GL_UNSIGNED_INT_8_8_8_8_REV, surface, 0);
        if (result != kCGLNoError) {
            CFRelease(surface);
            return NULL;
        }
        return surface;
    }
}

void libmpv_surface_release(IOSurfaceRef surface) {
    CFRelease(surface);
}
