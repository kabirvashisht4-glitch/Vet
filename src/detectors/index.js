// Registry of language detectors. To support a new language, write a file
// like the others in this folder and add it to the list below.
import javascript from './javascript.js';
import python from './python.js';
import go from './go.js';
import ruby from './ruby.js';
import rust from './rust.js';
import java from './java.js';
import php from './php.js';
import csharp from './csharp.js';
import kotlin from './kotlin.js';

export const detectors = [javascript, python, go, ruby, rust, java, php, csharp, kotlin];
