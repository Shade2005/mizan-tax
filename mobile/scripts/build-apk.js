/**
 * Mizan (ميزان) - One-Command Automated Android APK Assembler
 * Handles:
 *  1. Environment detection (JAVA_HOME, ANDROID_HOME)
 *  2. Running 'npx expo prebuild --platform android'
 *  3. Patching Windows MAX_PATH (>260 chars) CMake limits & staging dirs
 *  4. Disabling R8 bytecode stripping (enableMinifyInReleaseBuilds=false) for testing stability
 *  5. Assembling standalone release APK via Gradle
 *  6. Deploying APK to project root & mobile directory
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const mobileDir = path.resolve(__dirname, '..');
const projectRootDir = path.resolve(mobileDir, '..');
const androidDir = path.join(mobileDir, 'android');

console.log('================================================================');
console.log('   MIZAN UAE TAX - ANDROID APK BUILD PIPELINE');
console.log('================================================================');

// 1. Configure Environment Variables
if (!process.env.JAVA_HOME) {
  const defaultJava = 'E:\\Android Studio\\jbr';
  if (fs.existsSync(defaultJava)) {
    process.env.JAVA_HOME = defaultJava;
  }
}
if (!process.env.ANDROID_HOME) {
  const defaultSdk = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\shade\\AppData\\Local', 'Android\\Sdk');
  if (fs.existsSync(defaultSdk)) {
    process.env.ANDROID_HOME = defaultSdk;
  }
}
console.log(`[Env] JAVA_HOME:    ${process.env.JAVA_HOME}`);
console.log(`[Env] ANDROID_HOME: ${process.env.ANDROID_HOME}`);

// 2. Ensure Staging Directories
const stagingDir = 'C:\\c';
const reanimatedStagingDir = 'C:\\c\\rea';
if (!fs.existsSync(stagingDir)) fs.mkdirSync(stagingDir, { recursive: true });
if (!fs.existsSync(reanimatedStagingDir)) fs.mkdirSync(reanimatedStagingDir, { recursive: true });

// 3. Run Prebuild if needed or requested
const shouldPrebuild = process.argv.includes('--prebuild') || !fs.existsSync(path.join(androidDir, 'build.gradle'));
if (shouldPrebuild) {
  console.log('\n[Step 1/4] Running "npx expo prebuild --platform android"...');
  execSync('npx expo prebuild --platform android', {
    cwd: mobileDir,
    stdio: 'inherit',
    env: process.env,
  });
} else {
  console.log('\n[Step 1/4] Using prebuilt android directory...');
}

// 4. Apply Windows Path Length & Compatibility Patches
console.log('\n[Step 2/4] Applying Windows compatibility & build patches...');

// 4.1 Patch android/app/build.gradle with buildStagingDirectory
const appBuildGradlePath = path.join(androidDir, 'app', 'build.gradle');
if (fs.existsSync(appBuildGradlePath)) {
  let content = fs.readFileSync(appBuildGradlePath, 'utf8');
  if (!content.includes('buildStagingDirectory file("C:/c")')) {
    content = content.replace(
      'android {',
      'android {\n    externalNativeBuild {\n        cmake {\n            buildStagingDirectory file("C:/c")\n        }\n    }'
    );
    fs.writeFileSync(appBuildGradlePath, content, 'utf8');
    console.log('  ✔ Injected C:/c staging directory into android/app/build.gradle');
  }
}

// 4.2 Patch android/gradle.properties: disable minify to prevent runtime crashes in testing APK
const gradlePropsPath = path.join(androidDir, 'gradle.properties');
if (fs.existsSync(gradlePropsPath)) {
  let props = fs.readFileSync(gradlePropsPath, 'utf8');
  if (props.includes('android.enableMinifyInReleaseBuilds=true')) {
    props = props.replace('android.enableMinifyInReleaseBuilds=true', 'android.enableMinifyInReleaseBuilds=false');
    fs.writeFileSync(gradlePropsPath, props, 'utf8');
    console.log('  ✔ Disabled R8 minification in gradle.properties for reliable test execution');
  }
}

// 4.3 Patch react-native-reanimated build.gradle.kts
const reaBuildGradle = path.join(mobileDir, 'node_modules', 'react-native-reanimated', 'android', 'build.gradle.kts');
if (fs.existsSync(reaBuildGradle)) {
  let reaContent = fs.readFileSync(reaBuildGradle, 'utf8');
  if (!reaContent.includes('buildStagingDirectory = file("C:/c/rea")')) {
    reaContent = reaContent.replace(
      'path = file("CMakeLists.txt")',
      'path = file("CMakeLists.txt")\n            buildStagingDirectory = file("C:/c/rea")'
    );
    fs.writeFileSync(reaBuildGradle, reaContent, 'utf8');
    console.log('  ✔ Injected C:/c/rea staging directory into react-native-reanimated');
  }
}

// 4.4 Patch react-native-gesture-handler CMakeLists.txt
const rnghCmake = path.join(mobileDir, 'node_modules', 'react-native-gesture-handler', 'android', 'CMakeLists.txt');
if (fs.existsSync(rnghCmake)) {
  const rnghContent = `cmake_minimum_required(VERSION 3.13)
project(GestureHandlerCodegen)

set(CMAKE_VERBOSE_MAKEFILE on)
set(CMAKE_CXX_STANDARD 20)

file(GLOB_RECURSE _orig_gh_SRCS CONFIGURE_DEPENDS ../shared/shadowNodes/*.cpp)
file(GLOB_RECURSE _orig_gh_HEADERS CONFIGURE_DEPENDS ../shared/shadowNodes/*.h)
file(GLOB_RECURSE _orig_codegen_SRCS CONFIGURE_DEPENDS ./build/generated/source/codegen/jni/*.cpp)
file(GLOB_RECURSE _orig_codegen_HEADERS CONFIGURE_DEPENDS ./build/generated/source/codegen/jni/*.h)

foreach(header_file \${_orig_gh_HEADERS} \${_orig_codegen_HEADERS})
  get_filename_component(header_name \${header_file} NAME)
  configure_file(\${header_file} \${CMAKE_CURRENT_BINARY_DIR}/\${header_name} COPYONLY)
endforeach()

set(rn_gesture_handler_SRCS)
foreach(src_file \${_orig_gh_SRCS} \${_orig_codegen_SRCS})
  get_filename_component(src_name \${src_file} NAME)
  configure_file(\${src_file} \${CMAKE_CURRENT_BINARY_DIR}/\${src_name} COPYONLY)
  list(APPEND rn_gesture_handler_SRCS \${CMAKE_CURRENT_BINARY_DIR}/\${src_name})
endforeach()

add_library(
  react_codegen_rngesturehandler_codegen
  SHARED
  \${rn_gesture_handler_SRCS}
)

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 80)
  target_compile_reactnative_options(react_codegen_rngesturehandler_codegen PRIVATE)
endif()

target_include_directories(react_codegen_rngesturehandler_codegen PUBLIC \${CMAKE_CURRENT_BINARY_DIR})
target_include_directories(react_codegen_rngesturehandler_codegen PUBLIC ../shared/shadowNodes)
target_include_directories(react_codegen_rngesturehandler_codegen PUBLIC ../shared/shadowNodes/react/renderer/components/rngesturehandler_codegen)
target_include_directories(react_codegen_rngesturehandler_codegen PUBLIC ./build/generated/source/codegen/jni)

target_link_libraries(
  react_codegen_rngesturehandler_codegen
  fbjni
  jsi
  reactnative
)
`;
  fs.writeFileSync(rnghCmake, rnghContent, 'utf8');
  console.log('  ✔ Applied flattened path CMakeLists to react-native-gesture-handler');
}

// 4.5 Patch react-native-safe-area-context CMakeLists.txt
const rnsacCmake = path.join(mobileDir, 'node_modules', 'react-native-safe-area-context', 'android', 'src', 'main', 'jni', 'CMakeLists.txt');
if (fs.existsSync(rnsacCmake)) {
  const rnsacContent = `cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(LIB_LITERAL safeareacontext)
set(LIB_TARGET_NAME react_codegen_\${LIB_LITERAL})

set(LIB_ANDROID_DIR \${CMAKE_CURRENT_SOURCE_DIR}/../../..)
set(LIB_COMMON_DIR \${LIB_ANDROID_DIR}/../common/cpp)
set(LIB_ANDROID_GENERATED_JNI_DIR \${LIB_ANDROID_DIR}/build/generated/source/codegen/jni)
set(LIB_ANDROID_GENERATED_COMPONENTS_DIR \${LIB_ANDROID_GENERATED_JNI_DIR}/react/renderer/components/\${LIB_LITERAL})

file(GLOB _raw_custom_srcs CONFIGURE_DEPENDS *.cpp \${LIB_COMMON_DIR}/react/renderer/components/\${LIB_LITERAL}/*.cpp)
file(GLOB _raw_codegen_srcs CONFIGURE_DEPENDS \${LIB_ANDROID_GENERATED_JNI_DIR}/*.cpp \${LIB_ANDROID_GENERATED_COMPONENTS_DIR}/*.cpp)

set(LIB_CUSTOM_SRCS)
foreach(src_file \${_raw_custom_srcs} \${_raw_codegen_srcs})
  get_filename_component(src_name \${src_file} NAME)
  configure_file(\${src_file} \${CMAKE_CURRENT_BINARY_DIR}/\${src_name} COPYONLY)
  list(APPEND LIB_CUSTOM_SRCS \${CMAKE_CURRENT_BINARY_DIR}/\${src_name})
endforeach()
set(LIB_CODEGEN_SRCS)

add_library(
  \${LIB_TARGET_NAME}
  SHARED
  \${LIB_CUSTOM_SRCS}
)

target_include_directories(
  \${LIB_TARGET_NAME}
  PUBLIC
  \${LIB_ANDROID_GENERATED_JNI_DIR}
  \${LIB_ANDROID_GENERATED_COMPONENTS_DIR}
  \${LIB_COMMON_DIR}
  \${LIB_COMMON_DIR}/react/renderer/components/\${LIB_LITERAL}
  .
  \${CMAKE_CURRENT_BINARY_DIR}
)

if (REACTNATIVE_MERGED_SO)
  target_link_libraries(
          \${LIB_TARGET_NAME}
          fbjni
          jsi
          reactnative
  )
else()
  target_link_libraries(
          \${LIB_TARGET_NAME}
          fbjni
          folly_runtime
          glog
          jsi
          react_codegen_rncore
          react_debug
          react_nativemodule_core
          react_render_core
          rrc_view
  )
endif()
`;
  fs.writeFileSync(rnsacCmake, rnsacContent, 'utf8');
  console.log('  ✔ Applied flattened path CMakeLists to react-native-safe-area-context');
}

// 4.6 Patch react-native-screens CMakeLists.txt
const rnscreensCmake = path.join(mobileDir, 'node_modules', 'react-native-screens', 'android', 'src', 'main', 'jni', 'CMakeLists.txt');
if (fs.existsSync(rnscreensCmake)) {
  const rnscreensContent = `cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE ON)

set(LIB_LITERAL rnscreens)
set(LIB_TARGET_NAME react_codegen_\${LIB_LITERAL})

set(LIB_ANDROID_DIR \${CMAKE_CURRENT_SOURCE_DIR}/../../..)
set(LIB_COMMON_DIR \${LIB_ANDROID_DIR}/../common/cpp)
set(LIB_COMMON_COMPONENTS_DIR \${LIB_COMMON_DIR}/react/renderer/components/\${LIB_LITERAL})
set(LIB_ANDROID_GENERATED_JNI_DIR \${LIB_ANDROID_DIR}/build/generated/source/codegen/jni)
set(LIB_ANDROID_GENERATED_COMPONENTS_DIR \${LIB_ANDROID_GENERATED_JNI_DIR}/react/renderer/components/\${LIB_LITERAL})

add_compile_options(
  -fexceptions
  -frtti
  -std=c++20
  -Wall
  -Wpedantic
  -Wno-gnu-zero-variadic-macro-arguments
  -Wno-dollar-in-identifier-extension
)

file(GLOB _raw_custom_srcs CONFIGURE_DEPENDS *.cpp \${LIB_COMMON_COMPONENTS_DIR}/*.cpp \${LIB_COMMON_COMPONENTS_DIR}/utils/*.cpp)
file(GLOB _raw_codegen_srcs CONFIGURE_DEPENDS \${LIB_ANDROID_GENERATED_COMPONENTS_DIR}/*.cpp)

set(LIB_CUSTOM_SRCS)
foreach(src_file \${_raw_custom_srcs} \${_raw_codegen_srcs})
  get_filename_component(src_name \${src_file} NAME)
  configure_file(\${src_file} \${CMAKE_CURRENT_BINARY_DIR}/\${src_name} COPYONLY)
  list(APPEND LIB_CUSTOM_SRCS \${CMAKE_CURRENT_BINARY_DIR}/\${src_name})
endforeach()
set(LIB_CODEGEN_SRCS)

add_library(
  \${LIB_TARGET_NAME}
  SHARED
  \${LIB_CUSTOM_SRCS}
)

target_include_directories(
  \${LIB_TARGET_NAME}
  PUBLIC
  \${CMAKE_CURRENT_BINARY_DIR}
  .
  \${LIB_COMMON_DIR}
  \${LIB_COMMON_COMPONENTS_DIR}
  \${LIB_ANDROID_GENERATED_JNI_DIR}
  \${LIB_ANDROID_GENERATED_COMPONENTS_DIR}
)

target_link_libraries(
  \${LIB_TARGET_NAME}
  ReactAndroid::reactnative
  ReactAndroid::jsi
  fbjni::fbjni
)

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 80)
  target_compile_reactnative_options(\${LIB_TARGET_NAME} PRIVATE)
endif()
`;
  fs.writeFileSync(rnscreensCmake, rnscreensContent, 'utf8');
  console.log('  ✔ Applied flattened path CMakeLists to react-native-screens');
}

// 4.7 Patch react-native-safe-area-context codegen ComponentDescriptors
const rnsacBuildGradle = path.join(mobileDir, 'node_modules', 'react-native-safe-area-context', 'android', 'build.gradle');
if (fs.existsSync(rnsacBuildGradle)) {
  let content = fs.readFileSync(rnsacBuildGradle, 'utf8');
  if (!content.includes('generateCodegenArtifactsFromSchema')) {
    content += `
afterEvaluate {
    if (tasks.findByName("generateCodegenArtifactsFromSchema")) {
        tasks.named("generateCodegenArtifactsFromSchema").configure {
            doLast {
                def compDesc = file("\${project.buildDir}/generated/source/codegen/jni/react/renderer/components/safeareacontext/ComponentDescriptors.h")
                if (compDesc.exists()) {
                    def text = compDesc.text
                    if (!text.contains("RNCSafeAreaViewComponentDescriptor.h")) {
                        compDesc.text = text.replace(
                            "#include <react/renderer/components/safeareacontext/ShadowNodes.h>",
                            "#include <react/renderer/components/safeareacontext/ShadowNodes.h>\\n#include <react/renderer/components/safeareacontext/RNCSafeAreaViewComponentDescriptor.h>"
                        )
                    }
                }
            }
        }
    }
}
`;
    fs.writeFileSync(rnsacBuildGradle, content, 'utf8');
    console.log('  ✔ Injected ComponentDescriptor hook into react-native-safe-area-context build.gradle');
  }
}

const safeAreaHeaders = [
  path.join(mobileDir, 'node_modules', 'react-native-safe-area-context', 'android', 'build', 'generated', 'source', 'codegen', 'jni', 'safeareacontext.h'),
  path.join(mobileDir, 'node_modules', 'react-native-safe-area-context', 'android', 'build', 'generated', 'source', 'codegen', 'jni', 'react', 'renderer', 'components', 'safeareacontext', 'ComponentDescriptors.h'),
];
for (const hPath of safeAreaHeaders) {
  if (fs.existsSync(hPath)) {
    let hContent = fs.readFileSync(hPath, 'utf8');
    if (!hContent.includes('RNCSafeAreaViewComponentDescriptor.h')) {
      if (hContent.includes('#include <react/renderer/components/safeareacontext/ShadowNodes.h>')) {
        hContent = hContent.replace(
          '#include <react/renderer/components/safeareacontext/ShadowNodes.h>',
          '#include <react/renderer/components/safeareacontext/ShadowNodes.h>\n#include <react/renderer/components/safeareacontext/RNCSafeAreaViewComponentDescriptor.h>'
        );
      }
      if (hContent.includes('#include <jsi/jsi.h>')) {
        hContent = hContent.replace(
          '#include <jsi/jsi.h>',
          '#include <jsi/jsi.h>\n#include <react/renderer/components/safeareacontext/RNCSafeAreaViewComponentDescriptor.h>'
        );
      }
      fs.writeFileSync(hPath, hContent, 'utf8');
      console.log('  ✔ Added RNCSafeAreaViewComponentDescriptor.h include to ' + path.basename(hPath));
    }
  }
}

// 4.8 Patch react-native-safe-area-context JavaScript/TypeScript files
const rnsacDir = path.join(mobileDir, 'node_modules', 'react-native-safe-area-context');
if (fs.existsSync(rnsacDir)) {
  const pureJsSrc = `import * as React from 'react';
import { View, StyleProp, ViewStyle, ViewProps } from 'react-native';
import { useSafeAreaInsets } from './SafeAreaContext';
import type { Edge } from './SafeArea.types';

export interface SafeAreaViewProps extends ViewProps {
  edges?: readonly Edge[] | Edge[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const SafeAreaView = React.forwardRef<View, SafeAreaViewProps>(({
  edges = ['top', 'right', 'bottom', 'left'],
  style,
  children,
  ...rest
}, ref) => {
  const insets = useSafeAreaInsets();
  const edgeList = Array.isArray(edges) ? edges : [];

  const paddingStyle: ViewStyle = {
    paddingTop: edgeList.includes('top') ? (insets?.top || 0) : 0,
    paddingBottom: edgeList.includes('bottom') ? (insets?.bottom || 0) : 0,
    paddingLeft: edgeList.includes('left') ? (insets?.left || 0) : 0,
    paddingRight: edgeList.includes('right') ? (insets?.right || 0) : 0,
  };

  return (
    <View ref={ref} style={[{ flex: 1 }, paddingStyle, style]} {...rest}>
      {children}
    </View>
  );
});

export default SafeAreaView;
`;

  const pureJsModule = `import * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from './SafeAreaContext';

export const SafeAreaView = React.forwardRef(({
  edges = ['top', 'right', 'bottom', 'left'],
  style,
  children,
  ...props
}, ref) => {
  const insets = useSafeAreaInsets();
  const edgeList = Array.isArray(edges) ? edges : [];
  const paddingStyle = {
    paddingTop: edgeList.includes('top') ? (insets?.top || 0) : 0,
    paddingBottom: edgeList.includes('bottom') ? (insets?.bottom || 0) : 0,
    paddingLeft: edgeList.includes('left') ? (insets?.left || 0) : 0,
    paddingRight: edgeList.includes('right') ? (insets?.right || 0) : 0,
  };
  return React.createElement(View, Object.assign({}, props, {
    style: [{ flex: 1 }, paddingStyle, style],
    ref: ref
  }), children);
});
`;

  const pureJsCjs = `"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SafeAreaView = void 0;
var _react = _interopRequireWildcard(require("react"));
var React = _react;
var _reactNative = require("react-native");
var _SafeAreaContext = require("./SafeAreaContext");

function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }

const SafeAreaView = exports.SafeAreaView = /*#__PURE__*/React.forwardRef(({
  edges = ['top', 'right', 'bottom', 'left'],
  style,
  children,
  ...props
}, ref) => {
  const insets = (0, _SafeAreaContext.useSafeAreaInsets)();
  const edgeList = Array.isArray(edges) ? edges : [];
  const paddingStyle = {
    paddingTop: edgeList.includes('top') ? (insets?.top || 0) : 0,
    paddingBottom: edgeList.includes('bottom') ? (insets?.bottom || 0) : 0,
    paddingLeft: edgeList.includes('left') ? (insets?.left || 0) : 0,
    paddingRight: edgeList.includes('right') ? (insets?.right || 0) : 0,
  };
  return /*#__PURE__*/React.createElement(_reactNative.View, _extends({}, props, {
    style: [{ flex: 1 }, paddingStyle, style],
    ref: ref
  }), children);
});
`;

  const srcPath = path.join(rnsacDir, 'src', 'SafeAreaView.tsx');
  const modPath = path.join(rnsacDir, 'lib', 'module', 'SafeAreaView.js');
  const cjsPath = path.join(rnsacDir, 'lib', 'commonjs', 'SafeAreaView.js');

  if (fs.existsSync(path.dirname(srcPath))) fs.writeFileSync(srcPath, pureJsSrc, 'utf8');
  if (fs.existsSync(path.dirname(modPath))) fs.writeFileSync(modPath, pureJsModule, 'utf8');
  if (fs.existsSync(path.dirname(cjsPath))) fs.writeFileSync(cjsPath, pureJsCjs, 'utf8');
  console.log('  ✔ Injected pure JS SafeAreaView implementations (src, module, commonjs)');
}

// 5. Run Gradle AssembleRelease
console.log('\n[Step 3/4] Assembling Release APK with Gradle...');
const gradlewCmd = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
execSync(`${gradlewCmd} assembleRelease`, {
  cwd: androidDir,
  stdio: 'inherit',
  env: process.env,
});

// 6. Locate and Deploy APK
console.log('\n[Step 4/4] Deploying APK to project destinations...');
const outputApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!fs.existsSync(outputApk)) {
  console.error('❌ Error: Expected APK output not found at: ' + outputApk);
  process.exit(1);
}

const rootTarget = path.join(projectRootDir, 'mizan-uae-tax.apk');
const mobileTarget = path.join(mobileDir, 'mizan-uae-tax.apk');

fs.copyFileSync(outputApk, rootTarget);
fs.copyFileSync(outputApk, mobileTarget);

const stat = fs.statSync(rootTarget);
const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);

console.log('================================================================');
console.log('   🎉 APK ASSEMBLED SUCCESSFULLY!');
console.log('================================================================');
console.log(`  Package:      com.mizan.uaetax`);
console.log(`  Size:         ${sizeMB} MB (${stat.size} bytes)`);
console.log(`  Root APK:     ${rootTarget}`);
console.log(`  Mobile APK:   ${mobileTarget}`);
console.log('================================================================');
