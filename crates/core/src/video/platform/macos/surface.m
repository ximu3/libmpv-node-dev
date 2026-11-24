#import <Foundation/Foundation.h>
#import <IOSurface/IOSurface.h>
#import <OpenGL/OpenGL.h>
#import <OpenGL/CGLRenderers.h>
#import <OpenGL/CGLIOSurface.h>
#import <OpenGL/gl3.h>
#import <dlfcn.h>

CGLContextObj libmpv_cgl_open(uint32_t renderer) {
    CGLPixelFormatAttribute attributes[] = {
        kCGLPFAOpenGLProfile, (CGLPixelFormatAttribute)kCGLOGLPVersion_3_2_Core,
        kCGLPFAAccelerated, kCGLPFAAllowOfflineRenderers,
        kCGLPFARendererID, (CGLPixelFormatAttribute)renderer, 0
    };
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
        ((uint32_t)selected & kCGLRendererIDMatchingMask) != (renderer & kCGLRendererIDMatchingMask)) {
        CGLSetCurrentContext(NULL);
        CGLReleaseContext(context);
        return NULL;
    }
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
