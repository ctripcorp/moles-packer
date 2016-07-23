// Image Asset
{{ SYMBOL.define }}('{{ moduleName }}', [ 'module' ], function(module) {
    'use strict';

    module.exports = {{ SYMBOL.execRequire }}('{{ AssetRegistry }}')
        .registerAsset({
            "httpServerLocation": "{{ asset.httpServerLocation }}",
            "width": {{ asset.width | default(1) }},
            "height": {{ asset.height | default(1) }},
            "scales": [{%
                for i in asset.scales %}{%
                    if loop.index > 1
                        %},{%
                    endif
                    %}{{ i }}{%
                endfor
                %}],
            "name": "{{ asset.name }}",
            "type": "{{ asset.type }}"
        });

    return module.exports;
});
