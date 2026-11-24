#import <Foundation/Foundation.h>
#import <Metal/Metal.h>
#import <OpenGL/OpenGL.h>

int libmpv_list_renderers(void *context, void (*visit)(void *, uint32_t, const char *)) {
    @autoreleasepool {
        CGLRendererInfoObj info = NULL;
        GLint count = 0;
        CGLError result = CGLQueryRendererInfo(UINT32_MAX, &info, &count);
        if (result != kCGLNoError) return result;

        NSArray<id<MTLDevice>> *devices = MTLCopyAllDevices();
        for (GLint index = 0; index < count; index++) {
            GLint accelerated = 0, renderer = 0, low = 0, high = 0;
            result = CGLDescribeRenderer(info, index, kCGLRPAccelerated, &accelerated);
            if (result != kCGLNoError) break;
            if (!accelerated) continue;
            result = CGLDescribeRenderer(info, index, kCGLRPRendererID, &renderer);
            if (result != kCGLNoError) break;

            NSString *name = nil;
            if (CGLDescribeRenderer(info, index, kCGLRPRegistryIDLow, &low) == kCGLNoError &&
                CGLDescribeRenderer(info, index, kCGLRPRegistryIDHigh, &high) == kCGLNoError) {
                uint64_t registry = ((uint64_t)(uint32_t)high << 32) | (uint32_t)low;
                for (id<MTLDevice> device in devices) {
                    if (device.registryID == registry) {
                        name = device.name;
                        break;
                    }
                }
            }
            if (!name) name = [NSString stringWithFormat:@"CGL renderer 0x%08x", (uint32_t)renderer];
            visit(context, (uint32_t)renderer, name.UTF8String);
        }
        CGLDestroyRendererInfo(info);
        return result;
    }
}
