public class JLox {
	class Node {
		int data;
		Node prev;
		Node next;

		Node(int data) {
			this.data = data;
			this.prev=null;
			this.next = null;
		}
	}

	/**
	 * @param head
	 * @param key
	 * @param newdata
	 * @return
	 */
	public static Node insertBefore(Node head, int key,int newdata) {
		Node curr = head;
		while (curr != null) {
			if (curr.data == key) {
				break;
			}
			curr = curr.next;
		}

		if (curr == null) {
			return head; // Key not found, return original head
		}

		// Create a new node 
		Node newNode = new JLox().new Node(newdata);
		newNode.prev = curr.prev;
		newNode.next = curr;

		if (curr.prev != null) {
			curr.prev.next = newNode; // Link the previous node to the new node
		} else {
			head = newNode; // If inserting before the head, update head
		}

		curr.prev = newNode; // Link the current node back to the new node
		return head; // Return the updated head of the list
	} 

	public static Node insertAfter(Node head, int key,int newdata) {
		Node curr = head;

		while (curr != null) {
			if (curr.data == key) {
				break;
			}
			curr=curr.next;
		}

		// creating a new node
		Node newNode = new JLox().new Node(newdata);
		newNode.prev = curr;
		newNode.next = curr.next;

		if (curr.next != null) {
			curr.next.prev = newNode;
		} else {
			head = newNode;
		}

		curr.next = newNode;
		return head;
	}

	public static Node delete(Node head, int key) {
		Node curr = head;

		while (curr != null) {
			if (curr.data == key) {
				break;
			}
			curr = curr.next;
		}

		curr.prev.next = curr.next;
		curr.next.prev =curr.prev;
		return head;
	}

	/**
	 * @param args
	 */
	public static void main(String[] args) {

		Node node1 = new JLox().new Node(1);
		Node node2 = new JLox().new Node(2);
		Node node3 = new JLox().new Node(3);

		// Linking the nodes
		node1.next = node2;
		node2.prev = node1;
		node2.next = node3;
		node3.prev = node2;

		System.out.println("Traversal of the linked list:");
		Node current = node1;
		while (current != null) {
			System.out.print(current.data + " ");
			current = current.next;
		}

		System.out.println("Insertion Before 1:");
		node1 = insertBefore(node1, 1, 0); // Update node1 to the new head
		Node current1 = node1;
		while (current1 != null) {
			System.out.print(current1.data + " ");
			current1 = current1.next;
		}

		System.out.println("Insertion After 1:");
		node1 = insertAfter(node1, 1, 0); // Update node1 to the new head
		Node current2 = node1;
		while (current2 != null) {
			System.out.print(current2.data + " ");
			current2 = current2.next;
		}

		System.out.println("Delete 2");
		node1 = delete(node1, 2); // Update node1 to the new head
		Node current3 = node1;
		while (current3 != null) {
			System.out.print(current3.data + " ");
			current3 = current3.next;
		}
	}
}