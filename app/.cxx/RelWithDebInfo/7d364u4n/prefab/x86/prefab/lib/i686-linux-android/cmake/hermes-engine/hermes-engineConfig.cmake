if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "C:/Users/Raj/.gradle/caches/9.6.1/transforms/310e222aa62de4c7dff9ebce7acf38c3/transformed/hermes-android-250829098.0.14-release/prefab/modules/hermesvm/libs/android.x86/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Raj/.gradle/caches/9.6.1/transforms/310e222aa62de4c7dff9ebce7acf38c3/transformed/hermes-android-250829098.0.14-release/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

