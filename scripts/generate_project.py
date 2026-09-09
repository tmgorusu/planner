#!/usr/bin/env python3
"""Generate the small, dependency-free Xcode project used by Plans."""

from __future__ import annotations

import hashlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECT_DIR = ROOT / "Plans.xcodeproj"


def uid(name: str) -> str:
    return hashlib.sha1(name.encode("utf-8")).hexdigest()[:24].upper()


def ref(name: str, comment: str | None = None) -> str:
    return f"{uid(name)} /* {comment or name} */"


objects: list[str] = []


def add(name: str, comment: str, body: str) -> None:
    objects.append(f"\t\t{ref(name, comment)} = {{\n{body}\n\t\t}};")


def array(values: list[str], indent: int = 4) -> str:
    padding = "\t" * indent
    inner = "\n".join(f"{padding}\t{value}," for value in values)
    return f"(\n{inner}\n{padding})"


# File references
files = {
    "file.base": ("Base.xcconfig", "text.xcconfig", "Base.xcconfig"),
    "file.privacy": (
        "PrivacyInfo.xcprivacy",
        "text.xml",
        "PrivacyInfo.xcprivacy",
    ),
    "file.shared.swift": (
        "PlansShared.swift",
        "sourcecode.swift",
        "Sources/PlansShared/PlansShared.swift",
    ),
    "file.shared.info": ("Info.plist", "text.plist.xml", "Info.plist"),
    "file.app.swift": ("PlansApp.swift", "sourcecode.swift", "PlansApp.swift"),
    "file.app.info": ("Info.plist", "text.plist.xml", "Info.plist"),
    "file.app.entitlements": (
        "PlansApp.entitlements",
        "text.plist.entitlements",
        "PlansApp.entitlements",
    ),
    "file.widget.swift": ("PlansWidget.swift", "sourcecode.swift", "PlansWidget.swift"),
    "file.widget.info": ("Info.plist", "text.plist.xml", "Info.plist"),
    "file.widget.entitlements": (
        "PlansWidget.entitlements",
        "text.plist.entitlements",
        "PlansWidget.entitlements",
    ),
    "file.share.swift": ("ShareExtension.swift", "sourcecode.swift", "ShareExtension.swift"),
    "file.share.info": ("Info.plist", "text.plist.xml", "Info.plist"),
    "file.share.entitlements": (
        "PlansShare.entitlements",
        "text.plist.entitlements",
        "PlansShare.entitlements",
    ),
    "file.tests.swift": (
        "PlansSharedTests.swift",
        "sourcecode.swift",
        "PlansSharedTests.swift",
    ),
}

for key, (name, file_type, path) in files.items():
    add(
        key,
        name,
        "\n".join(
            [
                "\t\t\tisa = PBXFileReference;",
                f"\t\t\tlastKnownFileType = {file_type};",
                f"\t\t\tname = {name};",
                f"\t\t\tpath = {path};",
                '\t\t\tsourceTree = "<group>";',
            ]
        ),
    )

products = {
    "product.shared": ("PlansShared.framework", "wrapper.framework"),
    "product.app": ("Plans.app", "wrapper.application"),
    "product.widget": ("PlansWidgetExtension.appex", "wrapper.app-extension"),
    "product.share": ("PlansShareExtension.appex", "wrapper.app-extension"),
    "product.tests": ("PlansTests.xctest", "wrapper.cfbundle"),
}
for key, (path, file_type) in products.items():
    add(
        key,
        path,
        "\n".join(
            [
                "\t\t\tisa = PBXFileReference;",
                f"\t\t\texplicitFileType = {file_type};",
                "\t\t\tincludeInIndex = 0;",
                f"\t\t\tpath = {path};",
                "\t\t\tsourceTree = BUILT_PRODUCTS_DIR;",
            ]
        ),
    )

# Build file references
build_files = {
    "build.shared.source": ("PlansShared.swift in Sources", "file.shared.swift", None),
    "build.app.source": ("PlansApp.swift in Sources", "file.app.swift", None),
    "build.widget.source": ("PlansWidget.swift in Sources", "file.widget.swift", None),
    "build.share.source": ("ShareExtension.swift in Sources", "file.share.swift", None),
    "build.tests.source": ("PlansSharedTests.swift in Sources", "file.tests.swift", None),
    "build.shared.app": ("PlansShared.framework in Frameworks", "product.shared", None),
    "build.shared.widget": ("PlansShared.framework in Frameworks", "product.shared", None),
    "build.shared.share": ("PlansShared.framework in Frameworks", "product.shared", None),
    "build.shared.tests": ("PlansShared.framework in Frameworks", "product.shared", None),
    "build.privacy.app": ("PrivacyInfo.xcprivacy in Resources", "file.privacy", None),
    "build.privacy.widget": ("PrivacyInfo.xcprivacy in Resources", "file.privacy", None),
    "build.privacy.share": ("PrivacyInfo.xcprivacy in Resources", "file.privacy", None),
    "build.widget.embed": (
        "PlansWidgetExtension.appex in Embed App Extensions",
        "product.widget",
        "{ATTRIBUTES = (RemoveHeadersOnCopy, CodeSignOnCopy, ); }",
    ),
    "build.share.embed": (
        "PlansShareExtension.appex in Embed App Extensions",
        "product.share",
        "{ATTRIBUTES = (RemoveHeadersOnCopy, CodeSignOnCopy, ); }",
    ),
}
for key, (comment, file_key, settings) in build_files.items():
    settings_line = f"\n\t\t\tsettings = {settings};" if settings else ""
    add(
        key,
        comment,
        "\n".join(
            [
                "\t\t\tisa = PBXBuildFile;",
                f"\t\t\tfileRef = {ref(file_key, files.get(file_key, products.get(file_key))[0])};"
                + settings_line,
            ]
        ),
    )

# Groups
add(
    "group.main",
    "Main Group",
    "\n".join(
        [
            "\t\t\tisa = PBXGroup;",
            f"\t\t\tchildren = {array([ref('group.configuration', 'Configuration'), ref('group.shared', 'PlansShared'), ref('group.app', 'PlansApp'), ref('group.widget', 'PlansWidgetExtension'), ref('group.share', 'PlansShareExtension'), ref('group.tests', 'PlansTests'), ref('group.products', 'Products')])};",
            '\t\t\tsourceTree = "<group>";',
        ]
    ),
)

group_specs = {
    "group.configuration": (
        "Configuration",
        "Configuration",
        ["file.base", "file.privacy"],
    ),
    "group.shared": (
        "PlansShared",
        "PlansShared",
        ["file.shared.swift", "file.shared.info"],
    ),
    "group.app": (
        "PlansApp",
        "PlansApp",
        ["file.app.swift", "file.app.info", "file.app.entitlements"],
    ),
    "group.widget": (
        "PlansWidgetExtension",
        "PlansWidgetExtension",
        ["file.widget.swift", "file.widget.info", "file.widget.entitlements"],
    ),
    "group.share": (
        "PlansShareExtension",
        "PlansShareExtension",
        ["file.share.swift", "file.share.info", "file.share.entitlements"],
    ),
    "group.tests": (
        "PlansTests",
        "PlansTests",
        ["file.tests.swift"],
    ),
}
for key, (name, path, children) in group_specs.items():
    add(
        key,
        name,
        "\n".join(
            [
                "\t\t\tisa = PBXGroup;",
                f"\t\t\tchildren = {array([ref(child, files[child][0]) for child in children])};",
                f"\t\t\tpath = {path};",
                '\t\t\tsourceTree = "<group>";',
            ]
        ),
    )

add(
    "group.products",
    "Products",
    "\n".join(
        [
            "\t\t\tisa = PBXGroup;",
            f"\t\t\tchildren = {array([ref(key, value[0]) for key, value in products.items()])};",
            "\t\t\tname = Products;",
            '\t\t\tsourceTree = "<group>";',
        ]
    ),
)

# Build phases
phase_specs = {
    "phase.shared.sources": ("Sources", "PBXSourcesBuildPhase", ["build.shared.source"]),
    "phase.shared.frameworks": ("Frameworks", "PBXFrameworksBuildPhase", []),
    "phase.shared.resources": ("Resources", "PBXResourcesBuildPhase", []),
    "phase.app.sources": ("Sources", "PBXSourcesBuildPhase", ["build.app.source"]),
    "phase.app.frameworks": ("Frameworks", "PBXFrameworksBuildPhase", ["build.shared.app"]),
    "phase.app.resources": ("Resources", "PBXResourcesBuildPhase", ["build.privacy.app"]),
    "phase.widget.sources": ("Sources", "PBXSourcesBuildPhase", ["build.widget.source"]),
    "phase.widget.frameworks": (
        "Frameworks",
        "PBXFrameworksBuildPhase",
        ["build.shared.widget"],
    ),
    "phase.widget.resources": (
        "Resources",
        "PBXResourcesBuildPhase",
        ["build.privacy.widget"],
    ),
    "phase.share.sources": ("Sources", "PBXSourcesBuildPhase", ["build.share.source"]),
    "phase.share.frameworks": (
        "Frameworks",
        "PBXFrameworksBuildPhase",
        ["build.shared.share"],
    ),
    "phase.share.resources": (
        "Resources",
        "PBXResourcesBuildPhase",
        ["build.privacy.share"],
    ),
    "phase.tests.sources": ("Sources", "PBXSourcesBuildPhase", ["build.tests.source"]),
    "phase.tests.frameworks": (
        "Frameworks",
        "PBXFrameworksBuildPhase",
        ["build.shared.tests"],
    ),
    "phase.tests.resources": ("Resources", "PBXResourcesBuildPhase", []),
}
for key, (comment, isa, files_in_phase) in phase_specs.items():
    add(
        key,
        comment,
        "\n".join(
            [
                f"\t\t\tisa = {isa};",
                "\t\t\tbuildActionMask = 2147483647;",
                f"\t\t\tfiles = {array([ref(item, build_files[item][0]) for item in files_in_phase])};",
                "\t\t\trunOnlyForDeploymentPostprocessing = 0;",
            ]
        ),
    )

add(
    "phase.app.embed",
    "Embed App Extensions",
    "\n".join(
        [
            "\t\t\tisa = PBXCopyFilesBuildPhase;",
            "\t\t\tbuildActionMask = 2147483647;",
            "\t\t\tdstPath = \"\";",
            "\t\t\tdstSubfolderSpec = 13;",
            f"\t\t\tfiles = {array([ref('build.widget.embed', build_files['build.widget.embed'][0]), ref('build.share.embed', build_files['build.share.embed'][0])])};",
            "\t\t\tname = \"Embed App Extensions\";",
            "\t\t\trunOnlyForDeploymentPostprocessing = 0;",
        ]
    ),
)

# Target proxies and dependencies
dependency_specs = [
    ("dep.app.shared", "target.shared", "PlansShared"),
    ("dep.app.widget", "target.widget", "PlansWidgetExtension"),
    ("dep.app.share", "target.share", "PlansShareExtension"),
    ("dep.widget.shared", "target.shared", "PlansShared"),
    ("dep.share.shared", "target.shared", "PlansShared"),
    ("dep.tests.shared", "target.shared", "PlansShared"),
]
for dep_key, target_key, target_name in dependency_specs:
    proxy_key = f"proxy.{dep_key}"
    add(
        proxy_key,
        "PBXContainerItemProxy",
        "\n".join(
            [
                "\t\t\tisa = PBXContainerItemProxy;",
                f"\t\t\tcontainerPortal = {ref('project', 'Project object')};",
                "\t\t\tproxyType = 1;",
                f"\t\t\tremoteGlobalIDString = {uid(target_key)};",
                f"\t\t\tremoteInfo = {target_name};",
            ]
        ),
    )
    add(
        dep_key,
        f"PBXTargetDependency {target_name}",
        "\n".join(
            [
                "\t\t\tisa = PBXTargetDependency;",
                f"\t\t\ttarget = {ref(target_key, target_name)};",
                f"\t\t\ttargetProxy = {ref(proxy_key, 'PBXContainerItemProxy')};",
            ]
        ),
    )

# Native targets
target_specs = {
    "target.shared": {
        "name": "PlansShared",
        "product": "product.shared",
        "type": "com.apple.product-type.framework",
        "phases": [
            "phase.shared.sources",
            "phase.shared.frameworks",
            "phase.shared.resources",
        ],
        "dependencies": [],
        "configs": "configlist.shared",
    },
    "target.app": {
        "name": "Plans",
        "product": "product.app",
        "type": "com.apple.product-type.application",
        "phases": [
            "phase.app.sources",
            "phase.app.frameworks",
            "phase.app.resources",
            "phase.app.embed",
        ],
        "dependencies": ["dep.app.shared", "dep.app.widget", "dep.app.share"],
        "configs": "configlist.app",
    },
    "target.widget": {
        "name": "PlansWidgetExtension",
        "product": "product.widget",
        "type": "com.apple.product-type.app-extension",
        "phases": [
            "phase.widget.sources",
            "phase.widget.frameworks",
            "phase.widget.resources",
        ],
        "dependencies": ["dep.widget.shared"],
        "configs": "configlist.widget",
    },
    "target.share": {
        "name": "PlansShareExtension",
        "product": "product.share",
        "type": "com.apple.product-type.app-extension",
        "phases": [
            "phase.share.sources",
            "phase.share.frameworks",
            "phase.share.resources",
        ],
        "dependencies": ["dep.share.shared"],
        "configs": "configlist.share",
    },
    "target.tests": {
        "name": "PlansTests",
        "product": "product.tests",
        "type": "com.apple.product-type.bundle.unit-test",
        "phases": [
            "phase.tests.sources",
            "phase.tests.frameworks",
            "phase.tests.resources",
        ],
        "dependencies": ["dep.tests.shared"],
        "configs": "configlist.tests",
    },
}

for key, spec in target_specs.items():
    name = spec["name"]
    add(
        key,
        name,
        "\n".join(
            [
                "\t\t\tisa = PBXNativeTarget;",
                f"\t\t\tbuildConfigurationList = {ref(spec['configs'], f'Build configuration list for PBXNativeTarget \"{name}\"')};",
                f"\t\t\tbuildPhases = {array([ref(phase, phase.split('.')[-1].title()) for phase in spec['phases']])};",
                "\t\t\tbuildRules = ();",
                f"\t\t\tdependencies = {array([ref(dep, 'PBXTargetDependency') for dep in spec['dependencies']])};",
                f"\t\t\tname = {name};",
                f"\t\t\tproductName = {name};",
                f"\t\t\tproductReference = {ref(spec['product'], products[spec['product']][0])};",
                f"\t\t\tproductType = \"{spec['type']}\";",
            ]
        ),
    )

# Build configurations
project_debug = {
    "ALWAYS_SEARCH_USER_PATHS": "NO",
    "CLANG_ANALYZER_NONNULL": "YES",
    "CLANG_ENABLE_OBJC_ARC": "YES",
    "CLANG_WARN_DOCUMENTATION_COMMENTS": "YES",
    "COPY_PHASE_STRIP": "NO",
    "DEBUG_INFORMATION_FORMAT": "dwarf",
    "ENABLE_TESTABILITY": "YES",
    "GCC_C_LANGUAGE_STANDARD": "gnu17",
    "GCC_OPTIMIZATION_LEVEL": "0",
    "ONLY_ACTIVE_ARCH": "YES",
    "SDKROOT": "iphoneos",
    "SWIFT_ACTIVE_COMPILATION_CONDITIONS": '"DEBUG $(inherited)"',
}
project_release = {
    **project_debug,
    "COPY_PHASE_STRIP": "YES",
    "DEBUG_INFORMATION_FORMAT": '"dwarf-with-dsym"',
    "ENABLE_NS_ASSERTIONS": "NO",
    "ONLY_ACTIVE_ARCH": "NO",
    "SWIFT_COMPILATION_MODE": "wholemodule",
    "SWIFT_OPTIMIZATION_LEVEL": '"-O"',
}
project_release.pop("GCC_OPTIMIZATION_LEVEL", None)
project_release.pop("SWIFT_ACTIVE_COMPILATION_CONDITIONS", None)

target_settings = {
    "shared": {
        "DEFINES_MODULE": "YES",
        "INFOPLIST_FILE": "PlansShared/Info.plist",
        "MACH_O_TYPE": "staticlib",
        "PRODUCT_BUNDLE_IDENTIFIER": '"$(PLANS_BUNDLE_PREFIX).plans.shared"',
        "PRODUCT_NAME": "PlansShared",
        "SKIP_INSTALL": "YES",
        "SUPPORTED_PLATFORMS": '"iphoneos iphonesimulator"',
        "TARGETED_DEVICE_FAMILY": '"1,2"',
    },
    "app": {
        "CODE_SIGN_ENTITLEMENTS": "PlansApp/PlansApp.entitlements",
        "INFOPLIST_FILE": "PlansApp/Info.plist",
        "PRODUCT_BUNDLE_IDENTIFIER": '"$(PLANS_BUNDLE_PREFIX).plans"',
        "PRODUCT_NAME": "Plans",
        "SUPPORTED_PLATFORMS": '"iphoneos iphonesimulator"',
        "TARGETED_DEVICE_FAMILY": '"1,2"',
    },
    "widget": {
        "APPLICATION_EXTENSION_API_ONLY": "YES",
        "CODE_SIGN_ENTITLEMENTS": "PlansWidgetExtension/PlansWidget.entitlements",
        "INFOPLIST_FILE": "PlansWidgetExtension/Info.plist",
        "PRODUCT_BUNDLE_IDENTIFIER": '"$(PLANS_BUNDLE_PREFIX).plans.widget"',
        "PRODUCT_NAME": "PlansWidgetExtension",
        "SKIP_INSTALL": "YES",
        "SUPPORTED_PLATFORMS": '"iphoneos iphonesimulator"',
        "TARGETED_DEVICE_FAMILY": '"1,2"',
    },
    "share": {
        "APPLICATION_EXTENSION_API_ONLY": "YES",
        "CODE_SIGN_ENTITLEMENTS": "PlansShareExtension/PlansShare.entitlements",
        "INFOPLIST_FILE": "PlansShareExtension/Info.plist",
        "PRODUCT_BUNDLE_IDENTIFIER": '"$(PLANS_BUNDLE_PREFIX).plans.share"',
        "PRODUCT_NAME": "PlansShareExtension",
        "SKIP_INSTALL": "YES",
        "SUPPORTED_PLATFORMS": '"iphoneos iphonesimulator"',
        "TARGETED_DEVICE_FAMILY": '"1,2"',
    },
    "tests": {
        "GENERATE_INFOPLIST_FILE": "YES",
        "PRODUCT_BUNDLE_IDENTIFIER": '"$(PLANS_BUNDLE_PREFIX).plans.tests"',
        "PRODUCT_NAME": "PlansTests",
        "SUPPORTED_PLATFORMS": '"iphoneos iphonesimulator"',
        "TARGETED_DEVICE_FAMILY": '"1,2"',
    },
}


def settings_block(settings: dict[str, str]) -> str:
    lines = ["\t\t\tbuildSettings = {"]
    lines.extend(f"\t\t\t\t{key} = {value};" for key, value in sorted(settings.items()))
    lines.append("\t\t\t};")
    return "\n".join(lines)


config_lists: dict[str, list[str]] = {"project": []}
for configuration, settings in (("Debug", project_debug), ("Release", project_release)):
    key = f"config.project.{configuration.lower()}"
    config_lists["project"].append(key)
    add(
        key,
        configuration,
        "\n".join(
            [
                "\t\t\tisa = XCBuildConfiguration;",
                f"\t\t\tbaseConfigurationReference = {ref('file.base', 'Base.xcconfig')};",
                settings_block(settings),
                f"\t\t\tname = {configuration};",
            ]
        ),
    )

for target_name, settings in target_settings.items():
    config_lists[target_name] = []
    for configuration in ("Debug", "Release"):
        key = f"config.{target_name}.{configuration.lower()}"
        config_lists[target_name].append(key)
        add(
            key,
            configuration,
            "\n".join(
                [
                    "\t\t\tisa = XCBuildConfiguration;",
                    f"\t\t\tbaseConfigurationReference = {ref('file.base', 'Base.xcconfig')};",
                    settings_block(settings),
                    f"\t\t\tname = {configuration};",
                ]
            ),
        )

for name, configurations in config_lists.items():
    key = f"configlist.{name}"
    owner = "PBXProject" if name == "project" else "PBXNativeTarget"
    add(
        key,
        f"Build configuration list for {owner}",
        "\n".join(
            [
                "\t\t\tisa = XCConfigurationList;",
                f"\t\t\tbuildConfigurations = {array([ref(item, item.split('.')[-1].title()) for item in configurations])};",
                "\t\t\tdefaultConfigurationIsVisible = 0;",
                "\t\t\tdefaultConfigurationName = Release;",
            ]
        ),
    )

# Project object
target_attributes = "\n".join(
    f"\t\t\t\t\t{uid(key)} = {{ CreatedOnToolsVersion = 15.4; ProvisioningStyle = Automatic; }};"
    for key in target_specs
)
add(
    "project",
    "Project object",
    "\n".join(
        [
            "\t\t\tisa = PBXProject;",
            "\t\t\tattributes = {",
            "\t\t\t\tBuildIndependentTargetsInParallel = 1;",
            "\t\t\t\tLastSwiftUpdateCheck = 1540;",
            "\t\t\t\tLastUpgradeCheck = 1540;",
            "\t\t\t\tTargetAttributes = {",
            target_attributes,
            "\t\t\t\t};",
            "\t\t\t};",
            f"\t\t\tbuildConfigurationList = {ref('configlist.project', 'Build configuration list for PBXProject')};",
            "\t\t\tcompatibilityVersion = \"Xcode 15.0\";",
            "\t\t\tdevelopmentRegion = en;",
            "\t\t\thasScannedForEncodings = 0;",
            "\t\t\tknownRegions = (en, Base, );",
            f"\t\t\tmainGroup = {ref('group.main', 'Main Group')};",
            f"\t\t\tproductRefGroup = {ref('group.products', 'Products')};",
            "\t\t\tprojectDirPath = \"\";",
            "\t\t\tprojectRoot = \"\";",
            f"\t\t\ttargets = {array([ref(key, spec['name']) for key, spec in target_specs.items()])};",
        ]
    ),
)

project = "\n".join(
    [
        "// !$*UTF8*$!",
        "{",
        "\tarchiveVersion = 1;",
        "\tclasses = {};",
        "\tobjectVersion = 60;",
        "\tobjects = {",
        "\n".join(objects),
        "\t};",
        f"\trootObject = {ref('project', 'Project object')};",
        "}",
        "",
    ]
)

PROJECT_DIR.mkdir(parents=True, exist_ok=True)
(PROJECT_DIR / "project.pbxproj").write_text(project)
print(PROJECT_DIR / "project.pbxproj")
