//!HOOK OUTPUT
//!BIND HOOKED
vec4 hook() {
    vec4 value = HOOKED_tex(HOOKED_pos);
    return vec4(value.rgb * 0.5, value.a);
}
