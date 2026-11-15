// `node --test tests/` 在当前 Node 上会把目录当成单个测试文件，
// 这个入口只做转发，保证文档里的命令可用；glob 方式仍直接跑各测试文件。
import './host.test.mjs'
import './mask.test.mjs'
