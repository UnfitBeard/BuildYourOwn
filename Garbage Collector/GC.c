typedef enum {
    OBJ_INT,
    OBJ_PAIR
} ObjectType;

// tagged union
typedef struct sObject
{
    ObjectType type; /* what kind of value is it? int : pair */

    union
    {
        // OBJ_INT
        int value;

        // OBJ_PAIR
        struct
        {
            struct sObject* head;
            struct sObject* tail;
        };
    }; 
} Object;

/* VM - will contain the stack that stores the variables currently in scope */
#define STACK_MAX 256

typedef struct {
    Object* stack[STACK_MAX];
    int stackSize;
} VM;

// Create and initialize a vm
VM* newVM() {
    VM* vm = malloc(sizeof(VM));
    vm->stackSize = 0;
    return vm;
}

// manipulate the stack
void push(VM* vm, Object* value) {
    assert(vm->stackSize < STACK_MAX, "Stack overflow!"); 
    vm->stack[vm->stackSize++] = value;
};

Object* pop(VM* vm) {
    assert(vm->stackSize > 0, "Stack underflow!");
    return vm->stack[--vm->stackSize];
};

// Helper functions to create objects
// this does memory allocations
Object* newObject(VM* vm, ObjectType type) {
    Object* object = malloc(sizeof(Object));
    object->type = type;
    return object;
}

// this ones push actual obejcts onto the VMs stack
// pushing ints
void pushInt(VM* vm, int intValue) {
    Object* object = newObject(vm, OBJ_INT);
    object->value = intValue;
    push(vm, object);
}

// pushing Pairs
Object* pushPair(VM* vm) {
    Object* object = newObject(vm, OBJ_PAIR); 
    object->tail = pop(vm);
    object->head = pop(vm);

    push(vm, object);
    return object;
}
