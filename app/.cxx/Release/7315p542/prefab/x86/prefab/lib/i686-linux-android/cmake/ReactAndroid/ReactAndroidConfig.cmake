if(NOT TARGET ReactAndroid::hermestooling)
add_library(ReactAndroid::hermestooling SHARED IMPORTED)
set_target_properties(ReactAndroid::hermestooling PROPERTIES
    IMPORTED_LOCATION "C:/Users/Raj/.gradle/caches/9.6.1/transforms/43ee4eb37d5855651c3d4270661b0fcf/transformed/react-android-0.86.0-debugOptimized/prefab/modules/hermestooling/libs/android.x86/libhermestooling.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Raj/.gradle/caches/9.6.1/transforms/43ee4eb37d5855651c3d4270661b0fcf/transformed/react-android-0.86.0-debugOptimized/prefab/modules/hermestooling/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::jsi)
add_library(ReactAndroid::jsi SHARED IMPORTED)
set_target_properties(ReactAndroid::jsi PROPERTIES
    IMPORTED_LOCATION "C:/Users/Raj/.gradle/caches/9.6.1/transforms/43ee4eb37d5855651c3d4270661b0fcf/transformed/react-android-0.86.0-debugOptimized/prefab/modules/jsi/libs/android.x86/libjsi.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Raj/.gradle/caches/9.6.1/transforms/43ee4eb37d5855651c3d4270661b0fcf/transformed/react-android-0.86.0-debugOptimized/prefab/modules/jsi/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::reactnative)
add_library(ReactAndroid::reactnative SHARED IMPORTED)
set_target_properties(ReactAndroid::reactnative PROPERTIES
    IMPORTED_LOCATION "C:/Users/Raj/.gradle/caches/9.6.1/transforms/43ee4eb37d5855651c3d4270661b0fcf/transformed/react-android-0.86.0-debugOptimized/prefab/modules/reactnative/libs/android.x86/libreactnative.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Raj/.gradle/caches/9.6.1/transforms/43ee4eb37d5855651c3d4270661b0fcf/transformed/react-android-0.86.0-debugOptimized/prefab/modules/reactnative/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

