const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/components/LearningWorkspace.jsx";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
  `  const [addingMistake, setAddingMistake] = useState(false);`,
  `  const [addingMistake, setAddingMistake] = useState(false);
  const [notice, setNotice] = useState('');`
);

t = t.replace(
  `      setQuestion('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveUnderstanding() {`,
  `      setQuestion('');
      setNotice('提问已保存');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveUnderstanding() {`
);

t = t.replace(
  `      setUnderstanding('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }`,
  `      setUnderstanding('');
      setNotice('你的理解已保存，可以在下面回看');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }`
);

t = t.replace(
  `      setMistakeQuestion('');
      setMistakeNote('');
      setAddingMistake(false);
      onMistakeAdded?.();`,
  `      setMistakeQuestion('');
      setMistakeNote('');
      setAddingMistake(false);
      setNotice('已加入错题库');
      onMistakeAdded?.();`
);

t = t.replace(
  `      setMistakeQuestion('');
      setMistakeNote('');
      setAddingMistake(false);
      onMistakeAdded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const workspace = (`,
  `      setMistakeQuestion('');
      setMistakeNote('');
      setAddingMistake(false);
      setNotice('已把这个函数加入错题库');
      onMistakeAdded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const workspace = (`
);

t = t.replace(
  `        {error && <div className="alert-error">{error}</div>}
        <div className="snippet-meta">`,
  `        {notice && <div className="alert-success">{notice}</div>}
        {error && <div className="alert-error">{error}</div>}
        <div className="snippet-meta">`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("NOTICE_ADDED");