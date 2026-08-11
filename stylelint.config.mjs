export default {
  root: true,
  extends: '@yusui/stylelint-config',
  // overrides: [
  //   {
  //     files: ['**/*.(scss|css|vue|html)'], // 匹配 SCSS/CSS/Vue/HTML 文件
  //     customSyntax: 'postcss-scss', // 使用 PostCSS SCSS 语法解析器
  //   },
  //   {
  //     files: ['**/*.(html|vue)'], // 匹配 Vue/HTML 文件
  //     customSyntax: 'postcss-html', // 使用 PostCSS HTML 语法解析器
  //   },
  // ],
  rules: {
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['deep'],
      },
    ],
    'value-no-vendor-prefix': null,
    'property-no-vendor-prefix': null,
    'declaration-block-no-duplicate-properties': null,
    'declaration-property-value-keyword-no-deprecated': null,
    // 'property-no-vendor-prefix': [true, { ignoreProperties: ['background', 'background-clip'] }],
    // 'declaration-block-no-duplicate-properties': [
    //   true,
    //   {
    //     ignore: [
    //       'consecutive-duplicates-with-different-syntaxes',
    //       'consecutive-duplicates-with-same-prefixless-values',
    //     ],
    //   },
    // ],
  },
};
