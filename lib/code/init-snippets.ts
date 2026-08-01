/**
 * How to build each structure for real, in the languages people actually take a DSA course in.
 *
 * Every snippet constructs the *same* instance the explainer's demo is seeded with, so a reader can
 * hold the picture and the code side by side. The note under each one says what the standard
 * library really gives you — which is usually the thing a textbook leaves out.
 *
 * This lives outside the registry on purpose: `StructureDef` is a frozen contract, and prose about
 * Python's `heapq` is not something an algorithm implementation should carry.
 */

export const LANGUAGES = ['python', 'java', 'cpp'] as const;

export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<Language, string> = {
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
};

export interface InitSnippet {
  /** Construction of the seeded example, plus the operations worth seeing next to it. */
  code: string;
  /** One line on what the standard library actually provides, and where it differs from the model. */
  note: string;
}

export type SnippetSet = Record<Language, InitSnippet>;

const SNIPPETS: Record<string, SnippetSet> = {
  array: {
    python: {
      code: `values = [5, 2, 9, 1, 7, 3]

values[2]            # 9 — one multiplication, O(1)
values.append(4)     # amortized O(1)
values.insert(0, 8)  # O(n): shifts every element right`,
      note: 'Python has no fixed-size array type in everyday use — `list` is the dynamic array, and it doubles its buffer as it grows.',
    },
    java: {
      code: `int[] fixed = {5, 2, 9, 1, 7, 3};   // length is set at creation
fixed[2];                           // 9 — O(1)

List<Integer> values = new ArrayList<>(List.of(5, 2, 9, 1, 7, 3));
values.add(4);       // amortized O(1)
values.add(0, 8);    // O(n): shifts every element right`,
      note: '`int[]` is the raw contiguous block; `ArrayList` wraps one and grows it by copying into a larger array.',
    },
    cpp: {
      code: `#include <vector>

std::vector<int> values{5, 2, 9, 1, 7, 3};

values[2];                          // 9 — O(1)
values.push_back(4);                // amortized O(1)
values.insert(values.begin(), 8);   // O(n)
values.reserve(60);                 // pre-grow, skipping the resizes`,
      note: '`std::vector` guarantees contiguous storage, so `&values[0]` really is a pointer into one block — the layout this page describes.',
    },
  },

  stack: {
    python: {
      code: `stack = []
for bracket in "([{":
    stack.append(bracket)   # push — O(1)

stack[-1]     # '{' — peek
stack.pop()   # '{'`,
      note: 'A list used from its end is the stack. Never reach for `pop(0)` — that is a queue operation, and it shifts the whole list.',
    },
    java: {
      code: `Deque<Character> stack = new ArrayDeque<>();
for (char c : "([{".toCharArray()) stack.push(c);

stack.peek();   // '{'
stack.pop();    // '{'`,
      note: 'Use `ArrayDeque`, not the legacy `java.util.Stack` — that one is synchronized and, confusingly, iterates bottom-up.',
    },
    cpp: {
      code: `#include <stack>

std::stack<char> stack;
for (char c : {'(', '[', '{'}) stack.push(c);

stack.top();   // '{'
stack.pop();   // returns void`,
      note: '`std::stack` is an adapter over `std::deque`. `pop()` returns nothing, so read `top()` before you pop.',
    },
  },

  queue: {
    python: {
      code: `from collections import deque

queue = deque([12, 7, 3, 9])

queue.append(5)   # enqueue — O(1)
queue.popleft()   # 12 — dequeue, O(1)`,
      note: '`deque` is a ring of blocks, so both ends are O(1). A list would make `pop(0)` an O(n) shift of everything behind it.',
    },
    java: {
      code: `Queue<Integer> queue = new ArrayDeque<>(List.of(12, 7, 3, 9));

queue.offer(5);   // enqueue
queue.poll();     // 12 — dequeue, null when empty`,
      note: '`offer`/`poll` signal failure by return value; `add`/`remove` throw. Pick one pair per queue and stay with it.',
    },
    cpp: {
      code: `#include <deque>
#include <queue>

std::queue<int> queue(std::deque<int>{12, 7, 3, 9});

queue.push(5);
queue.front();   // 12
queue.pop();`,
      note: 'The ring buffer drawn above is what a fixed-capacity queue looks like underneath. `std::queue` grows instead of wrapping.',
    },
  },

  'linked-list': {
    python: {
      code: `class Node:
    def __init__(self, value, next=None):
        self.value = value
        self.next = next

head = None
for value in reversed([3, 8, 1, 6, 4]):
    head = Node(value, head)   # push front — O(1)`,
      note: 'There is no singly linked list in the standard library, because `list` and `deque` win in every case it would be reached for. Writing the node is the exercise.',
    },
    java: {
      code: `LinkedList<Integer> list = new LinkedList<>(List.of(3, 8, 1, 6, 4));

list.addFirst(0);   // O(1)
list.get(3);        // O(n) — walks in from the nearer end`,
      note: '`LinkedList` is doubly linked, so `get(i)` costs a walk even though it looks like `ArrayList` at the call site.',
    },
    cpp: {
      code: `#include <forward_list>

std::forward_list<int> list{3, 8, 1, 6, 4};

list.push_front(0);                  // O(1)
auto it = list.begin();
list.insert_after(it, 7);            // O(1) given the node`,
      note: '`forward_list` is singly linked and deliberately has no `size()` — storing one would cost a field on every list.',
    },
  },

  'binary-search-tree': {
    python: {
      code: `class Node:
    def __init__(self, key):
        self.key, self.left, self.right = key, None, None

def insert(node, key):
    if node is None:      return Node(key)
    if key < node.key:    node.left = insert(node.left, key)
    elif key > node.key:  node.right = insert(node.right, key)
    return node

root = None
for key in [50, 30, 70, 20, 40, 60, 80]:
    root = insert(root, key)`,
      note: 'Python ships no ordered tree — `dict` covers lookup, and ordered access means the third-party `sortedcontainers`.',
    },
    java: {
      code: `TreeMap<Integer, String> tree = new TreeMap<>();
for (int key : new int[]{50, 30, 70, 20, 40, 60, 80}) tree.put(key, "");

tree.firstKey();       // 20 — leftmost node
tree.ceilingKey(45);   // 50 — the query a hash map cannot answer`,
      note: '`TreeMap` is a red-black tree: a BST that rebalances itself, which turns O(log n) from a hope into a guarantee.',
    },
    cpp: {
      code: `#include <set>

std::set<int> tree{50, 30, 70, 20, 40, 60, 80};

*tree.begin();          // 20
tree.lower_bound(45);   // iterator at 50`,
      note: '`set` and `map` are ordered trees; `unordered_set` and `unordered_map` are the hash tables. The names are the opposite way round from most languages.',
    },
  },

  'binary-heap': {
    python: {
      code: `import heapq

heap = [2, 5, 3, 11, 8, 6, 9]
heapq.heapify(heap)       # O(n), in place

heapq.heappush(heap, 4)   # O(log n)
heapq.heappop(heap)       # 2 — the minimum`,
      note: '`heapq` works directly on a list, in exactly the array-as-tree layout drawn above. For a max-heap, push negated values.',
    },
    java: {
      code: `PriorityQueue<Integer> heap =
    new PriorityQueue<>(List.of(2, 5, 3, 11, 8, 6, 9));

heap.offer(4);
heap.poll();   // 2 — the minimum`,
      note: 'Min-heap by default; pass `Comparator.reverseOrder()` for a max-heap. Iterating a `PriorityQueue` does not visit in sorted order.',
    },
    cpp: {
      code: `#include <queue>
#include <vector>

std::priority_queue<int, std::vector<int>, std::greater<int>> heap(
    std::greater<int>{}, std::vector<int>{2, 5, 3, 11, 8, 6, 9});

heap.push(4);
heap.top();   // 2
heap.pop();`,
      note: '`priority_queue` is a max-heap unless you pass `std::greater`, which is the opposite default from Python and Java.',
    },
  },

  trie: {
    python: {
      code: `END = "*"
root = {}

for word in ["cat", "car", "card", "dog", "do"]:
    node = root
    for ch in word:
        node = node.setdefault(ch, {})
    node[END] = True   # a word ends here`,
      note: 'Nested dicts are the idiomatic Python trie. The end marker is the whole reason `do` is a word and not just the start of `dog`.',
    },
    java: {
      code: `class TrieNode {
    Map<Character, TrieNode> children = new HashMap<>();
    boolean isWord;
}

TrieNode root = new TrieNode();
for (String word : List.of("cat", "car", "card", "dog", "do")) {
    TrieNode node = root;
    for (char c : word.toCharArray())
        node = node.children.computeIfAbsent(c, k -> new TrieNode());
    node.isWord = true;
}`,
      note: '`computeIfAbsent` makes the walk and the insert the same line — it returns the existing child or the one it just created.',
    },
    cpp: {
      code: `#include <string>
#include <unordered_map>

struct TrieNode {
    std::unordered_map<char, TrieNode> children;
    bool is_word = false;
};

TrieNode root;
for (std::string word : {"cat", "car", "card", "dog", "do"}) {
    TrieNode* node = &root;
    for (char c : word) node = &node->children[c];
    node->is_word = true;
}`,
      note: '`children[c]` default-constructs the child when it is missing, so descending and inserting are one operation.',
    },
  },

  graph: {
    python: {
      code: `from collections import defaultdict

edges = [("A", "B", 4), ("A", "C", 2), ("B", "C", 1),
         ("B", "D", 5), ("C", "D", 8), ("C", "E", 10),
         ("D", "E", 2), ("D", "F", 6), ("E", "F", 3)]

graph = defaultdict(list)
for u, v, w in edges:
    graph[u].append((v, w))
    graph[v].append((u, w))   # drop this line for a directed graph`,
      note: 'An adjacency list — the layout drawn above. O(V + E) memory, and a traversal only ever touches edges that exist.',
    },
    java: {
      code: `record Edge(String to, int weight) {}

Map<String, List<Edge>> graph = new HashMap<>();
for (String v : List.of("A", "B", "C", "D", "E", "F"))
    graph.put(v, new ArrayList<>());

graph.get("A").add(new Edge("B", 4));
graph.get("B").add(new Edge("A", 4));   // undirected: both directions`,
      note: 'An undirected edge is two directed entries. Forgetting the second one is the most common graph bug there is.',
    },
    cpp: {
      code: `#include <string>
#include <unordered_map>
#include <vector>

struct Edge { std::string to; int weight; };

std::unordered_map<std::string, std::vector<Edge>> graph;
graph["A"].push_back({"B", 4});
graph["B"].push_back({"A", 4});   // undirected: both directions`,
      note: 'For dense graphs or integer labels, swap the map for a `vector<vector<int>>` adjacency matrix and trade O(V²) memory for O(1) edge lookup.',
    },
  },

  'hash-table': {
    python: {
      code: `birth_years = {
    "ada": 1815, "alan": 1912, "grace": 1906,
    "edsger": 1930, "barbara": 1945,
}

birth_years["ada"]               # 1815 — O(1) average
birth_years.get("linus", 1969)   # a default instead of a KeyError`,
      note: 'CPython’s dict uses open addressing rather than the chaining drawn above, and it has preserved insertion order since 3.7.',
    },
    java: {
      code: `Map<String, Integer> birthYears = new HashMap<>(Map.of(
    "ada", 1815, "alan", 1912, "grace", 1906,
    "edsger", 1930, "barbara", 1945));

birthYears.get("ada");                   // 1815
birthYears.getOrDefault("linus", 1969);`,
      note: '`HashMap` chains collisions, then converts a bucket to a red-black tree past eight entries — so a bad hash degrades to O(log n), not O(n).',
    },
    cpp: {
      code: `#include <string>
#include <unordered_map>

std::unordered_map<std::string, int> birth_years{
    {"ada", 1815}, {"alan", 1912}, {"grace", 1906},
    {"edsger", 1930}, {"barbara", 1945}};

birth_years.at("ada");   // 1815 — throws if missing
birth_years["linus"];    // inserts 0 — the classic surprise`,
      note: '`operator[]` inserts a default-constructed value for a missing key. Use `.at()` or `.find()` when you mean to look without writing.',
    },
  },

  'union-find': {
    python: {
      code: `parent = list(range(8))   # every element is its own root
rank = [0] * 8

def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]   # path compression
        x = parent[x]
    return x

def union(a, b):
    ra, rb = find(a), find(b)
    if ra == rb:
        return False
    if rank[ra] < rank[rb]:
        ra, rb = rb, ra
    parent[rb] = ra
    rank[ra] += rank[ra] == rank[rb]
    return True

for a, b in [(0, 1), (2, 3), (4, 5), (0, 2)]:
    union(a, b)`,
      note: 'Two flat arrays and no nodes at all. Union-find is the structure that is almost entirely its invariant.',
    },
    java: {
      code: `int[] parent = new int[8];
int[] rank = new int[8];
Arrays.setAll(parent, i -> i);   // every element is its own root

int find(int x) {
    if (parent[x] != x) parent[x] = find(parent[x]);   // path compression
    return parent[x];
}

void union(int a, int b) {
    int ra = find(a), rb = find(b);
    if (ra == rb) return;
    if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
    parent[rb] = ra;
    if (rank[ra] == rank[rb]) rank[ra]++;
}`,
      note: 'Union by rank keeps the trees shallow; path compression flattens what is left. Either alone is O(log n) — together they are effectively constant.',
    },
    cpp: {
      code: `#include <numeric>
#include <vector>

std::vector<int> parent(8), depth(8, 0);
std::iota(parent.begin(), parent.end(), 0);   // 0, 1, 2, … 7

int find(int x) {
    return parent[x] == x ? x : parent[x] = find(parent[x]);
}

void unite(int a, int b) {
    int ra = find(a), rb = find(b);
    if (ra == rb) return;
    if (depth[ra] < depth[rb]) std::swap(ra, rb);
    parent[rb] = ra;
    if (depth[ra] == depth[rb]) depth[ra]++;
}`,
      note: '`union` is a keyword, so the operation is usually named `unite` or `merge` — one of the few places C++ forces the API to rename itself.',
    },
  },
};

export function getInitSnippets(slug: string): SnippetSet | undefined {
  return SNIPPETS[slug];
}

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}
